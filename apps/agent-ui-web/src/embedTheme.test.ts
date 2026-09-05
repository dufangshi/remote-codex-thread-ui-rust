/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it } from "vitest";

import {
  applyDocumentTheme,
  EMBED_THEME_MESSAGE_TYPE,
  parseEmbedThemeMessage,
  resolveEffectiveTheme,
} from "./embedTheme";

describe("agent-ui-web embed theme", () => {
  afterEach(() => {
    document.documentElement.className = "";
    delete document.documentElement.dataset.themeEffective;
    document.documentElement.style.colorScheme = "";
    document.body.style.background = "";
    document.body.style.color = "";
  });

  it("resolves explicit light and dark without consulting the system", () => {
    expect(resolveEffectiveTheme("light")).toBe("light");
    expect(resolveEffectiveTheme("dark")).toBe("dark");
  });

  it("applies document color-scheme and body colors", () => {
    applyDocumentTheme("light");
    expect(document.documentElement.dataset.themeEffective).toBe("light");
    expect(document.documentElement.style.colorScheme).toBe("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(document.body.style.background.replace(/\s/g, "")).toMatch(
      /#f6f8fb|rgb\(246,248,251\)/i,
    );

    applyDocumentTheme("dark");
    expect(document.documentElement.dataset.themeEffective).toBe("dark");
    expect(document.documentElement.style.colorScheme).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.body.style.background.replace(/\s/g, "")).toMatch(
      /#101722|rgb\(16,23,34\)/i,
    );

    applyDocumentTheme("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("accepts Treer parent theme messages and ignores other payloads", () => {
    expect(
      parseEmbedThemeMessage({ type: EMBED_THEME_MESSAGE_TYPE, theme: "light" }),
    ).toBe("light");
    expect(
      parseEmbedThemeMessage({ type: EMBED_THEME_MESSAGE_TYPE, theme: "dark" }),
    ).toBe("dark");
    expect(
      parseEmbedThemeMessage({ type: EMBED_THEME_MESSAGE_TYPE, theme: "system" }),
    ).toBe("system");
    expect(parseEmbedThemeMessage({ type: EMBED_THEME_MESSAGE_TYPE, theme: "auto" })).toBeNull();
    expect(parseEmbedThemeMessage({ type: "other", theme: "light" })).toBeNull();
  });
});
