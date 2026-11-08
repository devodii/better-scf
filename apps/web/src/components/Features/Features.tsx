import { Clip } from "../Clip";
import { Feature } from "../Feature";

export function Features() {
  return (
    <>
      <Feature
        title="Keep your own shortlist"
        text="Mark a stance, shortlist what you like and jot private notes as you go. Handy for panel reviews, delegate decisions and your own voting. It all stays on your device."
      >
        <Clip
          name="review"
          label="Marking a stance, shortlisting and adding a private note"
        />
      </Feature>
      <Feature
        title="Find what matters fast"
        text="Tracks, teams and awards show on every card. Search a round and filter by track or by your own marks in a couple of clicks."
        isReversed
      >
        <Clip
          name="search-filters"
          label="Searching and filtering a round by track and shortlist"
        />
      </Feature>
      <Feature
        title="Ask anything, in plain words"
        text="Ask about a round or a proposal and get a straight answer, with the numbers and where they come from. No digging through pages."
      >
        <Clip
          name="ai-compare"
          label="Comparing a proposal's ask with the rest of the round"
        />
      </Feature>
      <Feature
        title="You stay in control"
        text="Before the assistant opens a page or touches anything personal, it asks. You decide, every time."
        isReversed
      >
        <Clip
          name="permission"
          label="The assistant asking permission before navigating"
        />
      </Feature>
      <Feature
        title="Read proposals faster"
        text="Jump to any section, see the tranche totals at a glance and share a proposal with one click."
      >
        <Clip
          name="proposal-tools"
          label="Jumping to a section and sharing a proposal"
        />
      </Feature>
      <Feature
        title="Know who is behind a proposal"
        text="Team avatars open each builder's Stellarlight profile, so you can see their track record across the Stellar ecosystem. Or just ask the assistant to look them up."
        isReversed
      >
        <Clip
          name="stellarlight"
          label="Opening a builder's Stellarlight profile and asking the assistant about them"
        />
      </Feature>
    </>
  );
}
