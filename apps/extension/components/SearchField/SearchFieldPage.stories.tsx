import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import searchCss from "../../entrypoints/scf.content/styles/dashboard-search.scss?inline";
import { SearchField } from "./SearchField";

const PAGE_CSS = `
.repro{box-sizing:border-box;min-height:100vh;padding:3.5rem 1.5rem;background:#0f0f0f;color:#fff;font-family:Arial,sans-serif}
.repro-page{display:flex;flex-direction:column;gap:2.5rem}
.repro-heading{margin:0;font:400 2.9rem/4rem Impact,'Arial Narrow',sans-serif;text-align:center;text-transform:uppercase}
.repro-intro{margin:0;font-size:1rem;line-height:2rem}
.repro-section{margin:0;font:400 2rem/2rem Impact,'Arial Narrow',sans-serif;text-transform:uppercase}
[data-bscf-search-bar]{--bscf-site-gap:40px}
@media (min-width:48rem){.repro{padding:3.5rem 5.25rem 3.5rem 19.25rem}.repro-heading{font-size:2.55rem;line-height:4rem;text-align:start}}
@media (min-width:80rem){.repro{padding:3.5rem 6rem 3.5rem 22rem}.repro-heading{font-size:4.95rem;line-height:7rem}}
`;

const INTRO =
  "The Stellar Community Fund has several opportunities to get funding and support for teams building on Stellar. Find the latest details on upcoming and completed award rounds or cohorts below.";

interface PageHeadingProps {
  withSearch: boolean;
}

function PageHeading({ withSearch }: PageHeadingProps) {
  const [value, setValue] = useState("");
  return (
    <div className="repro">
      <style>{PAGE_CSS}</style>
      <style>{searchCss}</style>
      <div
        className="repro-page"
        {...(withSearch ? { "data-bscf-search-row": "" } : {})}
      >
        <h2
          className="repro-heading"
          {...(withSearch ? { "data-bscf-search-heading": "" } : {})}
        >
          Award Rounds
        </h2>
        {withSearch && (
          <div data-bscf-search-bar="">
            <SearchField value={value} onValueChange={setValue} />
          </div>
        )}
        <p className="repro-intro">{INTRO}</p>
        <h4 className="repro-section">Open Rounds</h4>
      </div>
    </div>
  );
}

const meta = {
  title: "Search/SearchField/Page heading",
  component: PageHeading,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof PageHeading>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithSearch: Story = { args: { withSearch: true } };

export const WithoutSearch: Story = { args: { withSearch: false } };
