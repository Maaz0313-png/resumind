// JSON validation and repair utilities for AI feedback parsing

export interface FeedbackStructure {
  overallScore: number;
  ATS: {
    score: number;
    tips: Array<{
      type: "good" | "improve";
      tip: string;
    }>;
  };
  toneAndStyle: {
    score: number;
    tips: Array<{
      type: "good" | "improve";
      tip: string;
      explanation: string;
    }>;
  };
  content: {
    score: number;
    tips: Array<{
      type: "good" | "improve";
      tip: string;
      explanation: string;
    }>;
  };
  structure: {
    score: number;
    tips: Array<{
      type: "good" | "improve";
      tip: string;
      explanation: string;
    }>;
  };
  skills: {
    score: number;
    tips: Array<{
      type: "good" | "improve";
      tip: string;
      explanation: string;
    }>;
  };
}

/**
 * Validates if the parsed object matches the expected feedback structure
 */
export function validateFeedbackStructure(obj: any): obj is FeedbackStructure {
  if (!obj || typeof obj !== 'object') return false;
  
  // Check required top-level properties
  if (typeof obj.overallScore !== 'number') return false;
  
  const sections = ['ATS', 'toneAndStyle', 'content', 'structure', 'skills'];
  
  for (const section of sections) {
    if (!obj[section] || typeof obj[section] !== 'object') return false;
    if (typeof obj[section].score !== 'number') return false;
    if (!Array.isArray(obj[section].tips)) return false;
    
    // Validate tips array
    for (const tip of obj[section].tips) {
      if (!tip || typeof tip !== 'object') return false;
      if (!['good', 'improve'].includes(tip.type)) return false;
      if (typeof tip.tip !== 'string') return false;
      
      // ATS section has different tip structure
      if (section !== 'ATS' && typeof tip.explanation !== 'string') {
        return false;
      }
    }
  }
  
  return true;
}

/**
 * Attempts to repair common JSON formatting issues
 */
export function repairJSON(jsonString: string): string {
  let repaired = jsonString.trim();
  
  // Remove any text before the first opening brace
  const firstBrace = repaired.indexOf('{');
  if (firstBrace > 0) {
    repaired = repaired.substring(firstBrace);
  }
  
  // Remove any text after the last closing brace
  const lastBrace = repaired.lastIndexOf('}');
  if (lastBrace >= 0 && lastBrace < repaired.length - 1) {
    repaired = repaired.substring(0, lastBrace + 1);
  }
  
  // Fix common issues
  repaired = repaired
    // Fix unterminated strings - this is a simple approach
    .replace(/:\s*"([^"]*?)(?=\s*[,}])/g, ': "$1"')
    // Fix missing commas between object properties
    .replace(/}\s*"([^"]+)":\s*/g, '}, "$1": ')
    // Fix missing commas between array elements
    .replace(/}\s*{/g, '}, {')
    // Remove trailing commas
    .replace(/,(\s*[}\]])/g, '$1')
    // Fix newlines in strings (basic approach)
    .replace(/"([^"]*)\n([^"]*)"/g, '"$1\\n$2"');
  
  return repaired;
}

/**
 * Creates a fallback feedback structure with error message
 */
export function createFallbackFeedback(errorMessage: string = 'AI parsing failed'): FeedbackStructure {
  const errorTip = {
    type: 'improve' as const,
    tip: 'Manual review needed',
    explanation: `${errorMessage}. Please try uploading your resume again or contact support if the issue persists.`
  };
  
  const basicTip = {
    type: 'improve' as const,
    tip: 'Upload failed - please try again'
  };
  
  return {
    overallScore: 50,
    ATS: {
      score: 50,
      tips: [basicTip]
    },
    toneAndStyle: {
      score: 50,
      tips: [errorTip]
    },
    content: {
      score: 50,
      tips: [errorTip]
    },
    structure: {
      score: 50,
      tips: [errorTip]
    },
    skills: {
      score: 50,
      tips: [errorTip]
    }
  };
}

/**
 * Comprehensive JSON parsing with multiple fallback strategies
 */
export function parseAIFeedback(rawText: string): {
  success: boolean;
  feedback: FeedbackStructure | null;
  method: string;
  error?: string;
} {
  const cleanedText = rawText.trim();
  
  // Strategy 1: Direct parsing of cleaned text
  let processedText = cleanedText;
  
  // Remove markdown code blocks
  if (processedText.startsWith('```json')) {
    processedText = processedText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (processedText.startsWith('```')) {
    processedText = processedText.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  
  try {
    const parsed = JSON.parse(processedText);
    if (validateFeedbackStructure(parsed)) {
      return { success: true, feedback: parsed, method: 'direct' };
    } else {
      console.warn('Parsed JSON does not match expected structure');
    }
  } catch (error) {
    console.log('Direct parsing failed:', error);
  }
  
  // Strategy 2: Extract JSON object using regex
  const jsonMatch = processedText.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      if (validateFeedbackStructure(parsed)) {
        return { success: true, feedback: parsed, method: 'regex_extraction' };
      }
    } catch (error) {
      console.log('Regex extraction parsing failed:', error);
    }
    
    // Strategy 3: Attempt JSON repair
    try {
      const repairedJSON = repairJSON(jsonMatch[0]);
      const parsed = JSON.parse(repairedJSON);
      if (validateFeedbackStructure(parsed)) {
        return { success: true, feedback: parsed, method: 'repair' };
      }
    } catch (error) {
      console.log('Repair strategy failed:', error);
    }
  }
  
  // Strategy 4: Return fallback structure
  return {
    success: false,
    feedback: createFallbackFeedback('Unable to parse AI response'),
    method: 'fallback',
    error: 'All parsing strategies failed'
  };
}
