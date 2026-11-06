import type { Meta, StoryObj } from "@storybook/react-vite";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AvatarStack } from "../AvatarStack";
import { Chip } from "../Chip";
import { IconButton } from "../IconButton";
import { Toggle } from "../Toggle";
import { Tooltip } from "../Tooltip";
import { Popover } from "./Popover";

function ShadowFrame({ children }: { children: ReactNode }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [shadow, setShadow] = useState<ShadowRoot | null>(null);
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const root = host.shadowRoot ?? host.attachShadow({ mode: "open" });
    const css = Array.from(document.styleSheets)
      .flatMap((sheet) => {
        try {
          return Array.from(sheet.cssRules, (rule) => rule.cssText);
        } catch {
          return [];
        }
      })
      .join("\n");
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(
      `:host{all:initial !important}:host{color-scheme:dark !important}${css.replaceAll(":root", ":host")}`,
    );
    root.adoptedStyleSheets = [sheet];
    setShadow(root);
  }, []);
  return (
    <div ref={hostRef} data-shadow-host="">
      {shadow && createPortal(children, shadow)}
    </div>
  );
}

const meta = { title: "UI/ShadowCheck" } satisfies Meta;
export default meta;

export const InShadowRoot: StoryObj = {
  render: () => (
    <ShadowFrame>
      <div
        style={{
          display: "grid",
          gap: "1rem",
          padding: "4rem 10rem 9rem",
          width: "24rem",
        }}
      >
        <Tooltip content="From the on-chain metric section" isOpen>
          <Chip variant="purple">Integration</Chip>
        </Tooltip>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <Chip variant="olive">Open</Chip>
          <Chip variant="yellow">RFP</Chip>
          <Chip variant="muted">12 comments</Chip>
        </div>
        <AvatarStack
          size="md"
          people={[
            { name: "Ada Lovelace" },
            { name: "Grace Hopper" },
            { name: "Alan Turing" },
            { name: "Katherine Johnson" },
            { name: "Edsger Dijkstra" },
          ]}
        />
        <Toggle
          label="Track chips on cards"
          checked
          onChange={() => undefined}
        />
        <Popover
          label="Note"
          isOpen
          onOpenChange={() => undefined}
          trigger={
            <IconButton label="Note" variant="accent">
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M4 4h16v12H8l-4 4z" />
              </svg>
            </IconButton>
          }
        >
          Popover in the shadow root
        </Popover>
      </div>
    </ShadowFrame>
  ),
};
