import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Input, InputRef, Form, FormInstance } from 'antd';
import styled from 'styled-components';
import { get } from 'lodash';
import EllipsisWrapper from '@/components/EllipsisWrapper';

interface Props {
  children: React.ReactNode;
  dataIndex: string;
  record: any;
  rules?: any[];
  handleSave: (id: string | number, value: { [key: string]: string }) => void;
}

const EditableStyle = styled.div`
  line-height: 24px;
  min-height: 25px;
  color: inherit;

  * {
    color: inherit;
  }

  .editable-cell-value-wrap {
    padding: 0 7px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 4px;
    cursor: pointer;
    color: inherit;

    &:hover {
      border-color: rgba(255, 255, 255, 0.25);
    }
  }

  .editable-cell-value-wrap,
  .editable-cell-value-wrap > *,
  .editable-cell-value-wrap span,
  .editable-cell-value-wrap div {
    color: inherit;
  }

  .ant-form-item-control-input {
    min-height: 24px;
    .ant-input {
      line-height: 24px;
      background: rgba(255, 255, 255, 0.06);
      border-color: rgba(255, 255, 255, 0.15);
      color: var(--gray-3);
    }
  }
`;

export const EditableContext = createContext<FormInstance<any> | null>(null);

export default function EditableWrapper(props: Props) {
  const { children, dataIndex, record, rules, handleSave } = props;

  const [editing, setEditing] = useState(false);
  const textRef = useRef<HTMLDivElement>(null);
  const inputWidth = useRef(0);
  const inputRef = useRef<InputRef>(null);
  const form = useContext(EditableContext);
  const dataIndexKey = Array.isArray(dataIndex)
    ? dataIndex.join('.')
    : dataIndex;
  const displayValue = get(record, dataIndexKey);

  useEffect(() => {
    if (editing) inputRef.current!.focus();
  }, [editing]);

  const toggleEdit = () => {
    if (textRef.current) inputWidth.current = textRef.current.clientWidth;
    setEditing(!editing);
    const value = get(record, dataIndexKey);
    form.setFieldsValue({ [dataIndexKey]: value });
  };

  const save = async () => {
    try {
      const values = await form.validateFields();

      toggleEdit();
      handleSave(record.id, values);
    } catch (errInfo) {
      console.log('Save failed:', errInfo);
    }
  };

  const childNode = editing ? (
    <Form.Item style={{ margin: 0 }} name={dataIndexKey} rules={rules}>
      <Input
        size="small"
        ref={inputRef}
        onPressEnter={save}
        onBlur={save}
        style={{ width: inputWidth.current }}
      />
    </Form.Item>
  ) : (
    <div
      ref={textRef}
      className="editable-cell-value-wrap"
      style={{ paddingRight: 24 }}
      onClick={toggleEdit}
    >
      <EllipsisWrapper text={displayValue}>{children}</EllipsisWrapper>
    </div>
  );

  return <EditableStyle>{childNode}</EditableStyle>;
}
