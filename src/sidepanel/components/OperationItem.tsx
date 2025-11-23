/**
 * Page Modifier - Operation Item Component
 *
 * オペレーション表示の共通コンポーネント
 */

import { useState, useEffect } from 'react';
import type { Operation, Element } from '../../shared/types';
import prettier from 'prettier/standalone';
import parserBabel from 'prettier/plugins/babel';
import parserEstree from 'prettier/plugins/estree';
import parserHtml from 'prettier/plugins/html';

interface OperationItemProps {
  operation: Operation;
}

interface DetailSection {
  label: string;
  content: string;
  language: string;
  run?: string;
}

export default function OperationItem({ operation }: OperationItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [detailSection, setDetailSection] = useState<DetailSection | null>(null);
  // Selectorを表示すべきかチェック
  const shouldShowSelector = () => {
    return operation.type !== 'execute';
  };

  // ElementをHTML文字列に変換
  const elementToHTML = (element: Element, indent = 0): string => {
    const indentStr = '  '.repeat(indent);
    const { tag, attributes, textContent, innerHTML, children } = element;

    // 属性を文字列化
    const attrsStr = attributes
      ? Object.entries(attributes)
          .map(([key, value]) => `${key}="${value}"`)
          .join(' ')
      : '';

    const openTag = `<${tag}${attrsStr ? ' ' + attrsStr : ''}>`;
    const closeTag = `</${tag}>`;

    // 子要素がある場合
    if (children && children.length > 0) {
      const childrenHTML = children
        .map((child: Element) => elementToHTML(child, indent + 1))
        .join('\n');
      return `${indentStr}${openTag}\n${childrenHTML}\n${indentStr}${closeTag}`;
    }

    // innerHTMLがある場合
    if (innerHTML) {
      return `${indentStr}${openTag}${innerHTML}${closeTag}`;
    }

    // textContentがある場合
    if (textContent) {
      return `${indentStr}${openTag}${textContent}${closeTag}`;
    }

    // 自己閉じタグ
    return `${indentStr}${openTag}${closeTag}`;
  };

  // HTMLを整形
  const formatHTML = async (html: string): Promise<string> => {
    try {
      return await prettier.format(html, {
        parser: 'html',
        plugins: [parserHtml],
        printWidth: 80,
        tabWidth: 2,
      });
    } catch {
      return html;
    }
  };

  // JavaScriptコードを整形
  const formatCode = async (code: string): Promise<string> => {
    try {
      return await prettier.format(code, {
        parser: 'babel',
        plugins: [parserBabel, parserEstree],
        printWidth: 80,
        tabWidth: 2,
        semi: true,
        singleQuote: true,
      });
    } catch {
      return code;
    }
  };

  // JSONを整形
  const formatJSON = async (json: string): Promise<string> => {
    try {
      return await prettier.format(json, {
        parser: 'json',
        plugins: [parserBabel, parserEstree],
        printWidth: 80,
        tabWidth: 2,
      });
    } catch {
      return json;
    }
  };

  // 詳細情報を取得・整形
  useEffect(() => {
    const loadDetailSection = async () => {
      let section: DetailSection | null = null;

      switch (operation.type) {
        case 'insert': {
          const element = operation.params.element;
          if (element) {
            const html = elementToHTML(element);
            const formatted = await formatHTML(html);
            section = {
              label: 'Element',
              content: formatted,
              language: 'html'
            };
          }
          break;
        }

        case 'update': {
          const params = operation.params;
          if (params.style) {
            const json = JSON.stringify(params.style, null, 2);
            const formatted = await formatJSON(json);
            section = {
              label: 'Style',
              content: formatted,
              language: 'json'
            };
          } else if (params.textContent !== undefined) {
            section = {
              label: 'Content',
              content: `Text: ${params.textContent}`,
              language: 'text'
            };
          } else if (params.attributes) {
            const json = JSON.stringify(params.attributes, null, 2);
            const formatted = await formatJSON(json);
            section = {
              label: 'Attributes',
              content: formatted,
              language: 'json'
            };
          }
          break;
        }

        case 'execute': {
          const code = operation.params.code;
          if (code) {
            const formatted = await formatCode(code);
            section = {
              label: 'Code',
              content: formatted,
              language: 'javascript',
              run: operation.params.run || 'once'
            };
          }
          break;
        }

        case 'delete':
          // deleteは詳細セクションなし（selectorのみ表示）
          break;
      }

      setDetailSection(section);
    };

    loadDetailSection();
  }, [operation]);

  return (
    <div
      className="px-3 py-2.5 bg-white dark:bg-gray-700 border border-github-gray-300 dark:border-gray-600 rounded-md text-[13px] w-full box-border cursor-pointer"
      onClick={() => setIsExpanded(!isExpanded)}
    >
      {/* ヘッダー: [type] description */}
      <div className="flex gap-2 items-center">
        <span className="px-2 py-0.5 bg-github-blue-50 dark:bg-github-blue-900 text-github-blue-500 dark:text-github-blue-400 rounded-xl text-[11px] font-semibold">
          {operation.type}
        </span>
        {operation.description && (
          <span className="text-xs text-gray-500 dark:text-gray-400 font-medium flex-1">
            {operation.description}
          </span>
        )}
      </div>

      {/* 詳細部分（展開時のみ表示） */}
      {isExpanded && (
        <div className="mt-2">
          {/* Selector */}
          {shouldShowSelector() && operation.type !== 'execute' && (
            <div className="mb-2">
              <div className="text-[11px] text-github-gray-400 dark:text-gray-400 font-semibold mb-1">
                Selector:
              </div>
              <code className="block text-xs text-gray-700 dark:text-gray-200 font-mono bg-github-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                {operation.params.selector}
              </code>
            </div>
          )}

          {/* Execute用のRun表示 */}
          {detailSection && detailSection.run && (
            <div className="mb-2">
              <div className="text-[11px] text-github-gray-400 dark:text-gray-400 font-semibold mb-1">
                Run:
              </div>
              <code className="block text-xs text-gray-700 dark:text-gray-200 font-mono bg-github-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                {detailSection.run}
              </code>
            </div>
          )}

          {/* 詳細セクション */}
          {detailSection && (
            <div>
              <div className="text-[11px] text-github-gray-400 dark:text-gray-400 font-semibold mb-1">
                {detailSection.label}:
              </div>
              <pre className="m-0 text-[11px] font-mono bg-github-gray-100 dark:bg-gray-800 px-2 py-1.5 rounded overflow-x-auto">
                <code className="text-gray-700 dark:text-gray-200">
                  {detailSection.content}
                </code>
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
