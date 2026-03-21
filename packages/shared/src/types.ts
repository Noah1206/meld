// Figma Node Types (simplified from Figma REST API)
export interface FigmaNodeData {
  id: string;
  name: string;
  type: string;
  visible?: boolean;
  absoluteBoundingBox?: BoundingBox;
  children?: FigmaNodeData[];
  fills?: Paint[];
  strokes?: Paint[];
  strokeWeight?: number;
  opacity?: number;
  effects?: Effect[];
  cornerRadius?: number;
  rectangleCornerRadii?: [number, number, number, number];
  layoutMode?: "HORIZONTAL" | "VERTICAL" | "NONE";
  primaryAxisAlignItems?: "MIN" | "CENTER" | "MAX" | "SPACE_BETWEEN";
  counterAxisAlignItems?: "MIN" | "CENTER" | "MAX";
  paddingLeft?: number;
  paddingRight?: number;
  paddingTop?: number;
  paddingBottom?: number;
  itemSpacing?: number;
  clipsContent?: boolean;
  // Text-specific
  characters?: string;
  style?: TextStyle;
  // Component-specific
  componentId?: string;
  componentPropertyDefinitions?: Record<string, ComponentPropertyDef>;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Color {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface Paint {
  type: "SOLID" | "GRADIENT_LINEAR" | "GRADIENT_RADIAL" | "IMAGE";
  visible?: boolean;
  opacity?: number;
  color?: Color;
  gradientStops?: GradientStop[];
  imageRef?: string;
  scaleMode?: "FILL" | "FIT" | "CROP" | "TILE";
}

export interface GradientStop {
  position: number;
  color: Color;
}

export interface Effect {
  type: "DROP_SHADOW" | "INNER_SHADOW" | "LAYER_BLUR" | "BACKGROUND_BLUR";
  visible: boolean;
  radius: number;
  color?: Color;
  offset?: { x: number; y: number };
  spread?: number;
}

export interface TextStyle {
  fontFamily: string;
  fontWeight: number;
  fontSize: number;
  textAlignHorizontal: "LEFT" | "CENTER" | "RIGHT" | "JUSTIFIED";
  textAlignVertical: "TOP" | "CENTER" | "BOTTOM";
  letterSpacing: number;
  lineHeightPx: number;
  fills?: Paint[];
}

export interface ComponentPropertyDef {
  type: "BOOLEAN" | "TEXT" | "INSTANCE_SWAP" | "VARIANT";
  defaultValue: string | boolean;
  variantOptions?: string[];
}

// Figma API Responses
export interface FigmaFileResponse {
  name: string;
  lastModified: string;
  thumbnailUrl: string;
  version: string;
  document: {
    id: string;
    name: string;
    type: "DOCUMENT";
    children: FigmaNodeData[];
  };
}

export interface FigmaImagesResponse {
  images: Record<string, string>;
}

// Code Mapping
export interface CodeMapping {
  id: string;
  projectId: string;
  figmaNodeId: string;
  figmaNodeName: string;
  codeFilePath: string;
  matchMethod: "naming" | "ai" | "manual" | "cache";
  confidence: number;
}

// AI Code Edit
export interface CodeEditResult {
  filePath: string;
  original: string;
  modified: string;
  explanation: string;
}

// Edit History
export interface EditHistoryEntry {
  id: string;
  projectId: string;
  figmaNodeId: string;
  figmaNodeName: string;
  filePath: string;
  originalContent: string;
  modifiedContent: string;
  userCommand: string;
  aiExplanation: string;
  commitSha?: string;
  status: "preview" | "applied" | "pushed" | "reverted";
  createdAt: string;
}

// Project
export interface Project {
  id: string;
  userId: string;
  name: string;
  figmaFileKey: string;
  figmaFileName?: string;
  githubOwner?: string;
  githubRepo?: string;
  githubBranch: string;
  githubBasePath: string;
  lastSyncedAt?: string;
  createdAt: string;
  updatedAt: string;
}
