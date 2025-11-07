declare module "react-native-markdown-display" {
  import { FC, ReactNode } from "react";
  import { TextStyle, ViewStyle } from "react-native";

  export type MarkdownStyle = {
    [element: string]: TextStyle | ViewStyle;
  };

  export type MarkdownProps = {
    children: ReactNode;
    style?: MarkdownStyle;
  };

  const Markdown: FC<MarkdownProps>;

  export default Markdown;
}
