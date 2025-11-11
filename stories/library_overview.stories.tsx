// library_overview.stories.tsx documents the default overview presentation for hazo_connect.
import type { Meta, StoryObj } from "@storybook/react";
import React from "react";

// LibraryOverviewProps describes the controllable props for the overview component.
type LibraryOverviewProps = {
  title_text?: string;
  description_text?: string;
};

// LibraryOverview renders the initial placeholder shown in Storybook.
const LibraryOverview = ({
  title_text = "hazo_connect component workspace",
  description_text = "Add new stories by placing files inside the stories directory."
}: LibraryOverviewProps) => {
  return (
    <section className="cls_story_overview mx-auto max-w-2xl rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
      <h2 className="text-2xl font-semibold text-slate-900">{title_text}</h2>
      <p className="mt-3 text-base text-slate-600">{description_text}</p>
    </section>
  );
};

// meta supplies Storybook with component metadata and documentation tags.
const meta: Meta<typeof LibraryOverview> = {
  title: "foundation/library_overview",
  component: LibraryOverview,
  tags: ["autodocs"]
};

export default meta;

// Primary defines the default story showcased in Storybook.
export const Primary: StoryObj<typeof LibraryOverview> = {
  args: {
    title_text: "hazo_connect component workspace",
    description_text: "Begin adding components under src/components and wire them into stories."
  }
};

