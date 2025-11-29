import { GoogleGenAI, Type, Schema } from "@google/genai";
import { DetectedSplitsResponse, SplitDirection } from "../types";

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API_KEY is missing in environment variables");
  }
  return new GoogleGenAI({ apiKey });
};

/**
 * Detects split lines in a stitched image.
 * direction: HORIZONTAL = finding Y coordinates (splitting rows)
 * direction: VERTICAL = finding X coordinates (splitting columns)
 */
export const detectSeams = async (
  base64Image: string,
  width: number,
  height: number,
  direction: SplitDirection = SplitDirection.HORIZONTAL
): Promise<number[]> => {
  const ai = getClient();

  // Clean base64 string if needed
  const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");

  const isHorizontal = direction === SplitDirection.HORIZONTAL;
  const axisLabel = isHorizontal ? "Y-coordinate (vertical pixel position)" : "X-coordinate (horizontal pixel position)";
  const seamType = isHorizontal ? "horizontal" : "vertical";
  const dimension = isHorizontal ? height : width;
  const orientationDesc = isHorizontal 
    ? "vertical stitch (long screenshot)" 
    : "horizontal stitch (panorama or side-by-side)";

  const prompt = `
    Analyze this image which is a ${orientationDesc} of multiple distinct images.
    The image dimensions are width: ${width}px, height: ${height}px.
    
    Identify the ${axisLabel} of the ${seamType} seams/boundaries where one sub-image ends and the next begins.
    
    Rules:
    1. Look for distinct ${seamType} dividing lines, sudden background color changes, or logical breaks in content.
    2. Do not split text paragraphs or single objects.
    3. Return the coordinates as integers.
    4. Do not include 0 or the maximum value (${dimension}).
    5. If no obvious splits are found, return an empty list.
  `;

  const responseSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      splitPoints: {
        type: Type.ARRAY,
        items: { type: Type.INTEGER },
        description: `Array of ${axisLabel} values representing the split lines.`,
      },
    },
    required: ["splitPoints"],
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          { inlineData: { mimeType: "image/png", data: cleanBase64 } },
          { text: prompt },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.1,
      },
    });

    const jsonText = response.text;
    if (!jsonText) return [];

    const parsed = JSON.parse(jsonText) as DetectedSplitsResponse;
    
    // Filter invalid points
    const validPoints = parsed.splitPoints
      .filter((val) => val > 0 && val < dimension)
      .sort((a, b) => a - b);

    return validPoints;
  } catch (error) {
    console.error("Gemini analysis failed:", error);
    return [];
  }
};