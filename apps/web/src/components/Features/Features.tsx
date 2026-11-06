import { Clip } from "../Clip";
import { Feature } from "../Feature";

export function Features() {
  return (
    <>
      <Feature
        title="Review privately"
        text="Mark your stance, shortlist the proposals you like and keep notes only you can see. It all stays on your device."
      >
        <Clip
          name="review"
          label="Marking a stance, shortlisting and adding a private note"
        />
      </Feature>
      <Feature
        title="Find the right proposals fast"
        text="Tracks, teams and awards show on every card. Search a round and filter by track or by your own marks in a couple of clicks."
        isReversed
      >
        <Clip
          name="search-filters"
          label="Searching and filtering a round by track and shortlist"
        />
      </Feature>
      <Feature
        title="Ask the assistant"
        text="Ask anything about a round or a proposal and get a straight answer, with the numbers and where they come from. No digging through pages."
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
    </>
  );
}
