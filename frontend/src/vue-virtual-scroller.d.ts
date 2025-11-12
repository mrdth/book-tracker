/**
 * Type declarations for vue-virtual-scroller
 * Package: vue-virtual-scroller@next (Vue 3 version)
 */

declare module 'vue-virtual-scroller' {
  import { DefineComponent } from 'vue';

  export interface DynamicScrollerItemProps {
    item: any;
    active: boolean;
    sizeDependencies?: any[];
    dataIndex?: number | string;
  }

  export interface DynamicScrollerProps {
    items: any[];
    minItemSize: number | string;
    keyField?: string;
  }

  export const DynamicScroller: DefineComponent<DynamicScrollerProps>;
  export const DynamicScrollerItem: DefineComponent<DynamicScrollerItemProps>;
}
