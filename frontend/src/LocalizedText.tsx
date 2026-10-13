import React from "react";
import { Text as NativeText, TextInput as NativeTextInput } from "react-native";
import type { TextProps, TextInputProps } from "react-native";
import { translateUiText, useLanguage } from "@/src/LanguageContext";

function translateChild(child: React.ReactNode, language: "en" | "hi"): React.ReactNode {
  if (typeof child === "string") return translateUiText(child, language);
  if (typeof child === "number" || child == null || typeof child === "boolean") return child;
  if (Array.isArray(child)) return child.map((part, index) => <React.Fragment key={index}>{translateChild(part, language)}</React.Fragment>);
  if (React.isValidElement(child)) {
    const element = child as React.ReactElement<any>;
    if (element.props && "children" in element.props) {
      return React.cloneElement(element, {
        children: translateChild(element.props.children, language),
      });
    }
  }
  return child;
}

export function LocalizedText({ children, ...props }: TextProps) {
  const { language } = useLanguage();
  return <NativeText {...props}>{translateChild(children, language)}</NativeText>;
}

export function LocalizedTextInput(props: TextInputProps) {
  const { language } = useLanguage();
  const placeholder = typeof props.placeholder === "string"
    ? translateUiText(props.placeholder, language)
    : props.placeholder;
  return <NativeTextInput {...props} placeholder={placeholder} />;
}
