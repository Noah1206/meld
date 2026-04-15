import { describe, it, expect } from "vitest";
import {
  listCodeConnectMappings,
  resolveComponent,
  generateImportSnippet,
  generateUsageSnippet,
  type FigmaCodeConnectMapping,
} from "@/lib/figma/code-connect";

describe("figma/code-connect", () => {
  it("listCodeConnectMappings returns an array (may be empty)", () => {
    const list = listCodeConnectMappings();
    expect(Array.isArray(list)).toBe(true);
  });

  it("resolveComponent returns null when no match", () => {
    expect(resolveComponent({ nodeId: "__nope__" })).toBeNull();
    expect(resolveComponent({ componentKey: "__nope__" })).toBeNull();
    expect(resolveComponent({ name: "___no_component_named_this___" })).toBeNull();
    expect(resolveComponent({})).toBeNull();
  });

  it("generateImportSnippet formats a named import", () => {
    const mapping: FigmaCodeConnectMapping = {
      figmaName: "Button / Primary",
      importPath: "@/components/ui/button",
      component: "Button",
    };
    expect(generateImportSnippet(mapping)).toBe(
      'import { Button } from "@/components/ui/button";'
    );
  });

  it("generateUsageSnippet includes prop hints when provided", () => {
    const mapping: FigmaCodeConnectMapping = {
      figmaName: "Button / Primary",
      importPath: "@/components/ui/button",
      component: "Button",
      props: {
        Label: { codeProp: "children", kind: "string" },
        Variant: { codeProp: "variant", kind: "enum" },
      },
    };
    const snippet = generateUsageSnippet(mapping);
    expect(snippet).toContain("<Button");
    expect(snippet).toContain("children=");
    expect(snippet).toContain("variant=");
    expect(snippet).toContain("/>");
  });

  it("generateUsageSnippet handles empty props", () => {
    const mapping: FigmaCodeConnectMapping = {
      figmaName: "Icon",
      importPath: "@/components/ui/icon",
      component: "Icon",
    };
    expect(generateUsageSnippet(mapping)).toBe("<Icon />");
  });
});
