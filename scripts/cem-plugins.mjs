// @custom-elements-manifest/analyzer plugins for cyber-ui. All of them run in
// packageLinkPhase, in the order listed in custom-elements-manifest.config.mjs.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

/**
 * The analyzer also records `dispatchEvent(new CustomEvent(name))` calls
 * whose name is a variable (e.g. the dropdown's emit() helper) as an event
 * literally called "name". Real events are `cyber-*` literals or are
 * documented with `@fires` (the form elements' native-style `input` /
 * `change`), so keep only those.
 */
export function documentedEventsOnly() {
  return {
    name: 'documented-events-only',
    packageLinkPhase({ customElementsManifest }) {
      for (const declaration of declarations(customElementsManifest)) {
        if (!declaration.events) continue;
        declaration.events = declaration.events.filter(
          (event) => event.name?.startsWith('cyber-') || event.description,
        );
      }
    },
  };
}

/**
 * Point module paths at the files the package ships instead of the TS
 * sources: src/components/x.ts → dist/components/x.js, src/index.ts →
 * dist/cyber-ui.js (mirrors the entries in vite.config.ts).
 */
export function publishedPaths() {
  const publish = (path) =>
    path === 'src/index.ts'
      ? 'dist/cyber-ui.js'
      : path.replace(/^src\/(.*)\.ts$/, 'dist/$1.js');
  const visit = (node) => {
    if (Array.isArray(node)) return node.forEach(visit);
    if (!node || typeof node !== 'object') return;
    for (const [key, value] of Object.entries(node)) {
      if ((key === 'path' || key === 'module') && typeof value === 'string') {
        node[key] = publish(value.replace(/^\//, ''));
      } else {
        visit(value);
      }
    }
  };
  return {
    name: 'published-paths',
    packageLinkPhase({ customElementsManifest }) {
      visit(customElementsManifest.modules);
    },
  };
}

/**
 * Framework typings from the manifest:
 * - React 19: `JSX.IntrinsicElements` — properties (React 19 sets them as
 *   properties), attribute spellings, and `on<event-name>` listeners (React
 *   19 adds a listener for `on` + the exact event name on custom elements).
 * - Vue 3: `GlobalComponents` — properties plus `onCamelCase` handlers,
 *   which is what `@cyber-close` in a template compiles to.
 * Prop types are taken from the element classes (`Pick<Class, …>`), so
 * they can't drift from the source; the manifest supplies names and event
 * types.
 */
export function frameworkTypes({ outdir, importFrom }) {
  return {
    name: 'framework-types',
    packageLinkPhase({ customElementsManifest }) {
      const elements = [...declarations(customElementsManifest)]
        .filter((d) => d.customElement && d.tagName)
        .sort((a, b) => a.tagName.localeCompare(b.tagName));
      const exported = exportedNames(customElementsManifest);
      const imports = new Set(elements.map((e) => e.name));
      const shapes = elements.map((element) =>
        shape(element, exported, imports),
      );

      const header = [
        '// Generated from custom-elements.json by scripts/cem-plugins.mjs — do not edit.',
        `import type { ${[...imports].sort().join(', ')} } from '${importFrom}';`,
      ];
      write(`${outdir}/react.d.ts`, [
        ...header,
        "import type { DetailedHTMLProps, HTMLAttributes } from 'react';",
        '',
        'type Base<E> = DetailedHTMLProps<HTMLAttributes<E>, E>;',
        '',
        "declare module 'react' {",
        '  namespace JSX {',
        '    interface IntrinsicElements {',
        ...shapes.map((s) => {
          const extra = typeLiteral('      ', [
            ...s.attributes,
            ...s.events.map(
              (e) => `'on${e.name}'?: (event: ${e.type}) => void`,
            ),
          ]);
          return `      '${s.tag}': ${intersect([`Base<${s.className}>`, s.props, extra])};`;
        }),
        '    }',
        '  }',
        '}',
        '',
      ]);
      write(`${outdir}/vue.d.ts`, [
        ...header,
        "import type { DefineComponent } from 'vue';",
        '',
        "declare module 'vue' {",
        '  interface GlobalComponents {',
        ...shapes.map((s) => {
          const extra = typeLiteral('    ', [
            ...s.attributes,
            ...s.events.map(
              (e) => `${handlerKey(e.name)}?: (event: ${e.type}) => void`,
            ),
          ]);
          return `    '${s.tag}': DefineComponent<${intersect([s.props, extra]) || '{}'}>;`;
        }),
        '  }',
        '}',
        '',
      ]);
    },
  };
}

function* declarations(manifest) {
  for (const module of manifest.modules ?? []) yield* module.declarations ?? [];
}

/** Every name the package entry exports — candidates for event-type imports. */
function exportedNames(manifest) {
  const names = new Set();
  for (const module of manifest.modules ?? []) {
    for (const entry of module.exports ?? []) names.add(entry.name);
  }
  return names;
}

function shape(element, exported, imports) {
  // settable public properties only: frameworks assign props as properties,
  // and assigning a getter-only one (form, validity, …) throws
  const fields = (element.members ?? []).filter(
    (m) =>
      m.kind === 'field' &&
      !m.static &&
      !m.readonly &&
      !m.privacy?.match(/private|protected/),
  );
  const fieldNames = new Set(fields.map((f) => f.name));
  // attributes spelled differently from their property (no-light-dismiss),
  // or with no property at all (the toaster's CSS-only `position`)
  const attributes = (element.attributes ?? [])
    .filter((a) => !fieldNames.has(a.name))
    .map((a) => {
      const type = fieldNames.has(a.fieldName)
        ? `${element.name}['${a.fieldName}']`
        : (a.type?.text ?? 'string');
      return `'${a.name}'?: ${type}`;
    });
  const events = (element.events ?? []).map((event) => {
    const type = event.type?.text ?? 'CustomEvent';
    // import package types an event detail mentions (ToastDismissReason)
    for (const word of type.match(/\b[A-Z]\w*/g) ?? []) {
      if (exported.has(word)) imports.add(word);
    }
    return { name: event.name, type };
  });
  const picked = fields.map((f) => `'${f.name}'`).join(' | ');
  return {
    tag: element.tagName,
    className: element.name,
    props: picked ? `Partial<Pick<${element.name}, ${picked}>>` : '',
    attributes,
    events,
  };
}

/** `{ a; b; }` over several lines at `indent`, or '' with no members. */
function typeLiteral(indent, members) {
  if (members.length === 0) return '';
  return `{\n${members.map((m) => `${indent}  ${m};\n`).join('')}${indent}}`;
}

function intersect(types) {
  return types.filter(Boolean).join(' & ');
}

/** `cyber-close` → `onCyberClose`, matching Vue's toHandlerKey(camelize()). */
function handlerKey(event) {
  const camel = event.replace(/-(\w)/g, (_, c) => c.toUpperCase());
  return `on${camel[0].toUpperCase()}${camel.slice(1)}`;
}

function write(path, lines) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, lines.join('\n'));
}
