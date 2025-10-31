# 04. 操作実装（Operations）

## 機能概要

プラグインエンジンで使用する各種操作（insert, remove, hide, style等）の詳細実装を行います。各操作タイプに特化した処理ロジックを提供し、エッジケースやエラーハンドリングを含めた堅牢な実装を目指します。

## 実装内容

### 1. 操作タイプ一覧

| 操作タイプ | 説明 | 用途例 |
|-----------|------|--------|
| **insert** | 要素を挿入 | ボタン追加、ツールバー追加 |
| **remove** | 要素を削除 | 不要な要素の削除 |
| **hide** | 要素を非表示 | 広告非表示、一時的な非表示 |
| **show** | 要素を表示 | 非表示要素の再表示 |
| **style** | スタイル適用 | 色変更、サイズ調整 |
| **modify** | 属性/内容変更 | href変更、テキスト書き換え |
| **replace** | 要素を置換 | アイコン差し替え、要素まるごと交換 |

### 2. Insert操作の詳細実装

```typescript
class InsertOperationHandler {
  /**
   * 要素を挿入
   */
  execute(targets: HTMLElement[], operation: Operation): OperationResult {
    if (!operation.element) {
      throw new Error('Insert operation requires element definition');
    }

    const insertedElements: HTMLElement[] = [];
    const position = operation.position || 'beforeend';

    targets.forEach(target => {
      // 既存チェック（重複防止）
      if (this.isDuplicate(target, operation)) {
        console.warn(`Duplicate insert detected for operation ${operation.id}`);
        return;
      }

      // 要素生成
      const newElement = this.createElementTree(operation.element, target);

      // data属性で追跡可能にする
      newElement.dataset.pluginOperation = operation.id;

      // 挿入
      this.insertElement(target, newElement, position);

      insertedElements.push(newElement);
    });

    return {
      operationId: operation.id,
      success: true,
      affectedElements: insertedElements.length,
    };
  }

  /**
   * 重複チェック
   */
  private isDuplicate(target: HTMLElement, operation: Operation): boolean {
    // 同じoperation IDを持つ要素が既に存在するか
    return target.querySelector(`[data-plugin-operation="${operation.id}"]`) !== null;
  }

  /**
   * 要素ツリーを生成（再帰）
   */
  private createElementTree(elementDef: Element, context: HTMLElement): HTMLElement {
    const el = document.createElement(elementDef.tag);

    // 属性
    if (elementDef.attributes) {
      Object.entries(elementDef.attributes).forEach(([key, value]) => {
        el.setAttribute(key, value);
      });
    }

    // スタイル
    if (elementDef.style) {
      Object.entries(elementDef.style).forEach(([key, value]) => {
        el.style[key as any] = value;
      });
    }

    // コンテンツ
    if (elementDef.textContent) {
      el.textContent = elementDef.textContent;
    } else if (elementDef.innerHTML) {
      // セキュリティ警告
      console.warn('Using innerHTML - ensure content is safe');
      el.innerHTML = elementDef.innerHTML;
    }

    // 子要素（再帰）
    if (elementDef.children) {
      elementDef.children.forEach(childDef => {
        const child = this.createElementTree(childDef, el);
        el.appendChild(child);
      });
    }

    return el;
  }

  /**
   * 要素を挿入
   */
  private insertElement(
    target: HTMLElement,
    element: HTMLElement,
    position: InsertPosition
  ): void {
    switch (position) {
      case 'beforebegin':
        target.before(element);
        break;
      case 'afterbegin':
        target.prepend(element);
        break;
      case 'beforeend':
        target.append(element);
        break;
      case 'afterend':
        target.after(element);
        break;
    }
  }
}
```

### 3. Remove操作の詳細実装

```typescript
class RemoveOperationHandler {
  /**
   * 要素を削除
   */
  execute(targets: HTMLElement[], operation: Operation): OperationResult {
    const removedCount = targets.length;

    targets.forEach(target => {
      // イベントリスナーのクリーンアップ
      this.cleanupEventListeners(target);

      // 削除実行
      target.remove();
    });

    return {
      operationId: operation.id,
      success: true,
      affectedElements: removedCount,
    };
  }

  /**
   * イベントリスナーをクリーンアップ
   */
  private cleanupEventListeners(element: HTMLElement): void {
    // プラグインが追加したイベントリスナーを削除
    // （実装は06_event_handlingで詳細化）
  }
}
```

### 4. Hide/Show操作の詳細実装

```typescript
class VisibilityOperationHandler {
  /**
   * 要素を非表示
   */
  hide(targets: HTMLElement[], operation: Operation): OperationResult {
    targets.forEach(target => {
      // 元のdisplayを保存
      if (!target.dataset.originalDisplay) {
        target.dataset.originalDisplay = target.style.display || 'block';
      }

      target.style.display = 'none';
      target.dataset.pluginHidden = operation.id;
    });

    return {
      operationId: operation.id,
      success: true,
      affectedElements: targets.length,
    };
  }

  /**
   * 要素を表示
   */
  show(targets: HTMLElement[], operation: Operation): OperationResult {
    targets.forEach(target => {
      // 元のdisplayを復元
      const originalDisplay = target.dataset.originalDisplay || '';
      target.style.display = originalDisplay;

      delete target.dataset.pluginHidden;
      delete target.dataset.originalDisplay;
    });

    return {
      operationId: operation.id,
      success: true,
      affectedElements: targets.length,
    };
  }
}
```

### 5. Style操作の詳細実装

```typescript
class StyleOperationHandler {
  /**
   * スタイルを適用
   */
  execute(targets: HTMLElement[], operation: Operation): OperationResult {
    if (!operation.style) {
      throw new Error('Style operation requires style definition');
    }

    targets.forEach(target => {
      // 元のスタイルを保存（復元可能にするため）
      if (!target.dataset.originalStyles) {
        const originalStyles: Record<string, string> = {};
        Object.keys(operation.style!).forEach(key => {
          originalStyles[key] = target.style[key as any] || '';
        });
        target.dataset.originalStyles = JSON.stringify(originalStyles);
      }

      // スタイル適用
      Object.entries(operation.style).forEach(([key, value]) => {
        target.style[key as any] = value;
      });

      target.dataset.pluginStyled = operation.id;
    });

    return {
      operationId: operation.id,
      success: true,
      affectedElements: targets.length,
    };
  }

  /**
   * スタイルを復元
   */
  restore(targets: HTMLElement[]): void {
    targets.forEach(target => {
      if (target.dataset.originalStyles) {
        const originalStyles = JSON.parse(target.dataset.originalStyles);
        Object.entries(originalStyles).forEach(([key, value]) => {
          target.style[key as any] = value as string;
        });

        delete target.dataset.originalStyles;
        delete target.dataset.pluginStyled;
      }
    });
  }
}
```

### 6. Modify操作の詳細実装

```typescript
class ModifyOperationHandler {
  /**
   * 属性・内容を変更
   */
  execute(targets: HTMLElement[], operation: Operation): OperationResult {
    targets.forEach(target => {
      // 属性変更
      if (operation.attributes) {
        // 元の属性を保存
        if (!target.dataset.originalAttributes) {
          const originalAttrs: Record<string, string> = {};
          Object.keys(operation.attributes).forEach(key => {
            originalAttrs[key] = target.getAttribute(key) || '';
          });
          target.dataset.originalAttributes = JSON.stringify(originalAttrs);
        }

        // 属性適用
        Object.entries(operation.attributes).forEach(([key, value]) => {
          target.setAttribute(key, value);
        });
      }

      target.dataset.pluginModified = operation.id;
    });

    return {
      operationId: operation.id,
      success: true,
      affectedElements: targets.length,
    };
  }
}
```

### 7. Replace操作の詳細実装

```typescript
class ReplaceOperationHandler {
  /**
   * 要素を置換
   */
  execute(targets: HTMLElement[], operation: Operation): OperationResult {
    if (!operation.element) {
      throw new Error('Replace operation requires element definition');
    }

    const replacedCount = targets.length;

    targets.forEach(target => {
      // 新要素生成
      const newElement = this.createElementTree(operation.element!, target.parentElement!);
      newElement.dataset.pluginReplaced = operation.id;

      // 元要素の情報を保存（復元のため）
      newElement.dataset.replacedElement = target.outerHTML;

      // 置換実行
      target.replaceWith(newElement);
    });

    return {
      operationId: operation.id,
      success: true,
      affectedElements: replacedCount,
    };
  }

  private createElementTree(elementDef: Element, context: HTMLElement): HTMLElement {
    // InsertOperationHandlerと同じロジック
    // 実際は共通ユーティリティとして分離
    return document.createElement('div'); // placeholder
  }
}
```

## 実装ステップ

### Phase 1: ハンドラークラス作成

- [ ] src/content/operations/insert.ts
- [ ] src/content/operations/remove.ts
- [ ] src/content/operations/visibility.ts（hide/show）
- [ ] src/content/operations/style.ts
- [ ] src/content/operations/modify.ts
- [ ] src/content/operations/replace.ts

### Phase 2: 共通ユーティリティ分離

- [ ] src/content/operations/element-creator.ts
  - [ ] createElementTree関数
  - [ ] 再帰処理の最適化
- [ ] src/content/operations/operation-utils.ts
  - [ ] 重複チェック
  - [ ] 元データの保存/復元

### Phase 3: 各操作の実装

- [ ] Insert操作の詳細実装
- [ ] Remove操作の詳細実装
- [ ] Hide/Show操作の詳細実装
- [ ] Style操作の詳細実装
- [ ] Modify操作の詳細実装
- [ ] Replace操作の詳細実装

### Phase 4: エラーハンドリング

- [ ] 操作失敗時の適切なエラーメッセージ
- [ ] 部分的成功の処理
- [ ] ロールバック機能（オプション）

### Phase 5: 最適化

- [ ] パフォーマンス最適化
- [ ] メモリリーク対策
- [ ] バッチ処理の実装

### Phase 6: テスト実装

- [ ] 各操作のユニットテスト
- [ ] エッジケースのテスト
- [ ] パフォーマンステスト

## 使用技術・ライブラリ

| 技術 | 用途 | バージョン |
|------|------|-----------|
| TypeScript | 型安全性 | ^5.6.0 |
| DOM API | DOM操作 | - |

## ファイル構成

```
src/
└── content/
    └── operations/
        ├── index.ts              # エクスポート
        ├── insert.ts             # Insert操作
        ├── remove.ts             # Remove操作
        ├── visibility.ts         # Hide/Show操作
        ├── style.ts              # Style操作
        ├── modify.ts             # Modify操作
        ├── replace.ts            # Replace操作
        ├── element-creator.ts    # 共通要素生成
        └── operation-utils.ts    # 共通ユーティリティ
```

## 依存関係

**前提条件:**
- 01_plugin_schema完了
- 03_plugin_engine完了

**この機能を使用する機能:**
- 03_plugin_engine

## テスト観点

- [ ] 各操作が正しく実行される
- [ ] 重複挿入が防止される
- [ ] 元の状態を復元できる
- [ ] エラー時に適切なメッセージが返される
- [ ] 大量の要素に対しても正常に動作する
- [ ] メモリリークが発生しない

## セキュリティ考慮事項

1. **innerHTML使用時**
   - XSS攻撃のリスク
   - 可能な限りtextContentを使用

2. **属性設定時**
   - href, srcなどの危険な属性の検証
   - javascript:スキームの禁止

## 注意点・制約事項

1. **元データの保存**
   - 復元機能のためdata属性を使用
   - data属性の肥大化に注意

2. **パフォーマンス**
   - 大量要素への操作時の最適化
   - リフロー/リペイントの最小化

3. **イベントリスナー**
   - 削除時の適切なクリーンアップ
   - メモリリーク防止

## 次のステップ

✅ 操作実装完了後
→ **05_element_selector.md**: 要素選択機能の実装
→ **06_event_handling.md**: イベント処理の実装
