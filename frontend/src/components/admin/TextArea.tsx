import type { TextareaHTMLAttributes } from 'react';
import styles from './TextArea.module.css';

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Extra CSS class merged with the base style */
  className?: string;
}

export default function TextArea({ className, ...rest }: TextAreaProps) {
  const cls = className ? `${styles.textarea} ${className}` : styles.textarea;
  return <textarea className={cls} {...rest} />;
}
