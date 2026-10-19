import { Viewer } from "@bytemd/react";
import {
  markdownPlugins,
  markdownPluginsLite,
} from "interface/markdownPlugins";
import "bytemd/dist/index.css";
import "katex/dist/katex.css";
import "highlight.js/styles/github.css";
import classes from "./index.module.css";

export default function MarkdownViewer({ value, rich = false }) {
  return (
    <div className={classes.viewer}>
      <Viewer
        value={value || ""}
        plugins={rich ? markdownPlugins : markdownPluginsLite}
      />
    </div>
  );
}
