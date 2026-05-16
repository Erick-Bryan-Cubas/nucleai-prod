import React from 'react';
import styled from 'styled-components';
import { Menu, MenuProps } from 'antd';

const StyledMenu = styled(Menu)`
  &.ant-menu {
    background-color: transparent;
    border-right: 0;
    color: var(--gray-4);

    &:not(.ant-menu-horizontal) {
      .ant-menu-item-selected {
        color: var(--gray-2);
        background-color: rgba(60, 174, 130, 0.15);
      }
    }

    .ant-menu-item-group {
      margin-top: 20px;

      &:first-child {
        margin-top: 0;
      }
    }

    .ant-menu-item-group-title {
      font-size: 12px;
      font-weight: 700;
      padding: 5px 16px;
      color: var(--gray-6);
    }

    .ant-menu-item {
      line-height: 28px;
      height: auto;
      margin: 0;
      font-weight: 500;

      &:not(last-child) {
        margin-bottom: 0;
      }

      &:not(.ant-menu-item-disabled):hover {
        color: var(--gray-2);
        background-color: rgba(255, 255, 255, 0.05);
      }

      &:not(.ant-menu-item-disabled):active {
        background-color: rgba(255, 255, 255, 0.08);
      }

      &:active {
        background-color: transparent;
      }

      &-selected {
        color: var(--gray-2);

        &:after {
          display: none;
        }

        &:hover {
          color: var(--gray-2);
        }
      }
    }
  }
`;

export default function SidebarMenu({
  items,
  selectedKeys,
  onSelect,
}: MenuProps) {
  return (
    <StyledMenu
      mode="inline"
      items={items}
      selectedKeys={selectedKeys}
      onSelect={onSelect}
    />
  );
}
