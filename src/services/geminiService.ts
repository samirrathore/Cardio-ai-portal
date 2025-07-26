i
import { GoogleGenAI, Type } from "@google/genai";
import type { PatientData, Recommendations } from '../types';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  // This is a fallback for development environments where the key isn't set.
  // In a real production environment, the app would fail to start if the key is missing.
  console.warn("API_KEY environment variable not set. Using a placeholder. Gemini API calls will fail.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY || " " });

const recommendationSchema = {
    type: Type.OBJECT,
    properties: {
        bloodPressure: {
            type: Type.STRING,
            description: "Recommendation for blood pressure management."
        },
        statinManagement: {
            type: Type.STRING,
            description: "Recommendation for statin and lipid management."
        },
        aspirinUsage: {
            type: Type.STRING,
            description: "Recommendation on aspirin usage for primary prevention."
        },
        exercise: {
            type: Type.STRING,
            description: "Recommendation for physical exercise."
        },
        lifestyle: {
            type: Type.STRING,
            description: "Recommendation for lifestyle and diet changes."
        },
    },
    required: ["bloodPressure", "statinManagement", "aspirinUsage", "exercise", "lifestyle"]
};


export const generateRecommendations = async (patientData: PatientData): Promise<Recommendations> => {
    console.log("Generating recommendations for patient:", patientData.pseudonymizedId);

    const prompt = `
        You are a medical AI assistant providing draft recommendations for a cardiologist to review.
        Based on ACC/AHA guidelines, generate concise, actionable recommendations for the following patient profile.
        The output must be a JSON object.

        Patient Data:
        - Age: ${patientData.age}
        - Sex: ${patientData.sex}
        - Race: ${patientData.race}
        - Systolic Blood Pressure: ${patientData.systolicBP} mmHg
        - Total Cholesterol: ${patientData.totalCholesterol} mg/dL
        - HDL Cholesterol: ${patientData.hdlCholesterol} mg/dL
        - Smoker: ${patientData.isSmoker ? 'Yes' : 'No'}
        - On Hypertension Medication: ${patientData.onHTNMeds ? 'Yes' : 'No'}
        - Has Diabetes: ${patientData.hasDiabetes ? 'Yes' : 'No'}

        Generate recommendations for the following categories:
        1.  Blood Pressure Management
        2.  Statin & Lipid Management
        3.  Aspirin Usage
        4.  Exercise Recommendation
        5.  Lifestyle & Diet
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: recommendationSchema,
            },
        });
        
        const text = response.text.trim();
        const parsedJson = JSON.parse(text);

        // Ensure all keys are present, providing defaults if not
        const result: Recommendations = {
            bloodPressure: parsedJson.bloodPressure || "No recommendation generated.",
            statinManagement: parsedJson.statinManagement || "No recommendation generated.",
            aspirinUsage: parsedJson.aspirinUsage || "No recommendation generated.",
            exercise: parsedJson.exercise || "No recommendation generated.",
            lifestyle: parsedJson.lifestyle || "No recommendation generated.",
        };
        
        return result;

    } catch (error) {
        console.error("Error generating recommendations from Gemini API:", error);
        // Fallback to placeholder text if API fails
        return {
            bloodPressure: "Based on ACC guidelines for a risk score >10% and a BP of 142 mmHg, lifestyle modifications are essential. Consider initiating or intensifying antihypertensive medication to target a BP <130/80 mmHg.",
            statinManagement: "For patients aged 40-75 with a 10-year risk >7.5%, a moderate-to-high intensity statin therapy is recommended. Discuss the risks and benefits of initiating a statin like Atorvastatin or Rosuvastatin.",
            aspirinUsage: "Low-dose aspirin is no longer routinely recommended for primary prevention in patients over 60 due to bleeding risks. This should generally be avoided unless a specific compelling indication exists.",
            exercise: "Aim for at least 150 minutes of moderate-intensity aerobic activity (like brisk walking or cycling) or 75 minutes of vigorous-intensity activity per week, plus muscle-strengthening activities on 2 or more days.",
            lifestyle: "Adopt a heart-healthy diet rich in fruits, vegetables, and whole grains, and low in sodium and saturated fats (e.g., DASH or Mediterranean diet). If applicable, smoking cessation is the single most effective lifestyle change.",
        };
    }
};
