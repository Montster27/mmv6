import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { TrackStorylet } from "@/types/tracks";
import { StoryletOfferMenu } from "@/components/play/StoryletOfferMenu";
import { offerReturnNote, withPassed } from "./offers";

const offer = (key: string, title: string, expires: number): TrackStorylet =>
  ({ progress_id: "p", track_key: "roommate", storylet_key: key, title, body: "", options: [], expires_on_day: expires }) as TrackStorylet;

describe("offer wording", () => {
  it("is honest about scenes that will not return", () => {
    expect(offerReturnNote(3, 3)).toEqual({ text: "Today only. If you pass, it will not come back.", final: true });
    expect(offerReturnNote(2, 3).final).toBe(true);
  });
  it("says a scene with days left may still be here", () => {
    expect(offerReturnNote(4, 3)).toEqual({ text: "If you pass, it may still be here tomorrow.", final: false });
    expect(offerReturnNote(9, 3).text).toMatch(/next few days/);
  });
  it("passes only the offers named", () => {
    const next = withPassed(new Set(["a"]), ["b"]);
    expect([...next].sort()).toEqual(["a", "b"]);
  });
});

describe("StoryletOfferMenu", () => {
  const render = (offers: TrackStorylet[]) =>
    renderToStaticMarkup(createElement(StoryletOfferMenu, { offers, dayIndex: 3, onChoose: () => {}, onPass: () => {}, onLeave: () => {} }));
  it("gives every offer its own Not now and says whether it will return", () => {
    const html = render([offer("a", "The hall phone", 3), offer("b", "The board", 6)]);
    expect(html).toContain("Not now: The hall phone");
    expect(html).toContain("Not now: The board");
    expect(html).toContain("Today only. If you pass, it will not come back.");
    expect(html).toContain("may still be here in the next few days");
    expect(html).toContain("Not now for any of these (some will not come back)");
  });
  it("offers no pass-everything button when there is only one moment", () => {
    const html = render([offer("a", "The hall phone", 5)]);
    expect(html).toContain("Not now: The hall phone");
    expect(html).not.toContain("Not now for any of these");
    expect(html).toContain("Something is happening.");
  });
});
