import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { TextField } from "./TextField";

const Search = () => (
  <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
    <path d="M8.5 2a6.5 6.5 0 0 1 5.2 10.4l4.4 4.4-1.3 1.3-4.4-4.4A6.5 6.5 0 1 1 8.5 2zm0 1.8a4.7 4.7 0 1 0 0 9.4 4.7 4.7 0 0 0 0-9.4z" />
  </svg>
);

const meta = {
  title: "UI/TextField",
  component: TextField,
  args: {
    label: "Search submissions",
    placeholder: "Title, team or tag",
    value: "",
    onChange: fn(),
    onClear: fn(),
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: "28rem", padding: "0.5rem" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof TextField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};

export const Filled: Story = { args: { value: "Soroban tooling" } };

export const WithLeadingIcon: Story = { args: { leadingIcon: <Search /> } };

export const AriaLabelOnly: Story = {
  args: {
    label: undefined,
    "aria-label": "Search submissions",
    leadingIcon: <Search />,
  },
};

export const Loading: Story = {
  args: { leadingIcon: <Search />, value: "Soroban tooling", isLoading: true },
};

export const LoadingEmpty: Story = {
  args: { leadingIcon: <Search />, isLoading: true },
};

export const Invalid: Story = {
  args: {
    value: "GABC",
    error: "Enter a full 56 character Stellar address",
    label: "Account address",
  },
};

export const InvalidWithoutMessage: Story = {
  args: { value: "GABC", isInvalid: true },
};

export const Disabled: Story = {
  args: { leadingIcon: <Search />, value: "Soroban tooling", disabled: true },
};

export const LongValue: Story = {
  args: {
    leadingIcon: <Search />,
    isLoading: true,
    value:
      "A very long search phrase about cross chain bridges, wallet onboarding flows and on-chain analytics for grant reviewers",
  },
};

export const Focused: Story = {
  args: { leadingIcon: <Search />, value: "Soroban tooling" },
  decorators: [
    (Story) => (
      <div data-force-focus>
        <Story />
      </div>
    ),
  ],
};

export const Hover: Story = {
  args: { leadingIcon: <Search />, value: "Soroban tooling" },
  decorators: [
    (Story) => (
      <div data-force-hover>
        <Story />
      </div>
    ),
  ],
};

export const Narrow390: Story = {
  args: {
    leadingIcon: <Search />,
    isLoading: true,
    value: "Soroban tooling and wallet onboarding",
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: "390px" }}>
        <Story />
      </div>
    ),
  ],
};

export const FocusedEmpty: Story = {
  args: { leadingIcon: <Search /> },
  decorators: [
    (Story) => (
      <div data-force-focus>
        <Story />
      </div>
    ),
  ],
};
