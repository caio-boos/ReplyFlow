import { Fragment, type ReactNode } from "react";

export type RichTags = Record<string, (chunks: ReactNode) => ReactNode>;

/**
 * Converte "Click <link>here</link> or <b>now</b>" em nós React usando as
 * funções de `tags`. Suporta aninhamento; tags desconhecidas viram texto puro.
 */
export function renderRich(message: string, tags: RichTags): ReactNode {
  let key = 0;

  function parse(src: string): ReactNode[] {
    const nodes: ReactNode[] = [];
    let i = 0;
    while (i < src.length) {
      const open = src.indexOf("<", i);
      if (open === -1) {
        nodes.push(src.slice(i));
        break;
      }
      const match = /^<([a-zA-Z][\w-]*)>/.exec(src.slice(open));
      if (!match) {
        nodes.push(src.slice(i, open + 1));
        i = open + 1;
        continue;
      }
      const name = match[1];
      const closeTag = `</${name}>`;
      // Encontra o fechamento correspondente considerando aninhamento da mesma tag.
      let depth = 0;
      let j = open;
      let close = -1;
      while (j < src.length) {
        if (src.startsWith(`<${name}>`, j)) {
          depth++;
          j += name.length + 2;
        } else if (src.startsWith(closeTag, j)) {
          depth--;
          if (depth === 0) {
            close = j;
            break;
          }
          j += closeTag.length;
        } else {
          j++;
        }
      }
      if (close === -1) {
        nodes.push(src.slice(i));
        break;
      }
      if (open > i) nodes.push(src.slice(i, open));
      const inner = parse(src.slice(open + match[0].length, close));
      const render = tags[name];
      nodes.push(
        <Fragment key={key++}>{render ? render(inner) : inner}</Fragment>,
      );
      i = close + closeTag.length;
    }
    return nodes;
  }

  return <>{parse(message)}</>;
}
