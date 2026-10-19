import { Viewer } from "@bytemd/react";
import breaks from "@bytemd/plugin-breaks";
import gfm from "@bytemd/plugin-gfm";
import "bytemd/dist/index.css";

const plugins = [gfm(), breaks()];

export default function MarkdownViewer({ value }) {
  return <Viewer value={value} plugins={plugins} />;
}
