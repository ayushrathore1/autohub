import { exactDictionary, soundMap } from '../data/dictionaries';

// ---------------------------------------------------------
// ?? TRANSLATION ENGINE (API-POWERED + FALLBACK)
// ---------------------------------------------------------
export const translationCache = new Map();

const looksCorruptedTranslation = (value: unknown): boolean => {
    if (value === null || value === undefined) return false;
    const s = String(value);
    if (!s) return false;

    // Check for Unicode replacement character (real encoding issue)
    if (s.includes('\uFFFD')) return true;

    // If string contains valid Devanagari/Hindi characters (U+0900-U+097F), it's valid
    const hasValidHindi = /[\u0900-\u097F]/.test(s);
    if (hasValidHindi) return false;

    // Only check for '?' corruption if no valid Hindi present
    const qCount = (s.match(/\?/g) || []).length;
    // If a meaningful chunk of the string is '?', it's almost certainly an encoding/placeholder issue.
    return qCount >= 2 && qCount / Math.max(1, s.length) > 0.12;
};

export const sanitizeDisplayText = (value: unknown, fallback: string = ''): string => {
    const s = value === null || value === undefined ? '' : String(value);
    if (!s) return '';
    if (looksCorruptedTranslation(s)) return fallback;
    return s;
};

// ?? GOOGLE TRANSLATE API (Free unofficial endpoint - reliable)
export const translateWithGoogle = async (text: string, from: string = 'en', to: string = 'hi'): Promise<string> => {
    if (!text || text.trim() === '') return '';

    const cacheKey = `gtrans:${from}:${to}:${text}`;
    if (translationCache.has(cacheKey)) return translationCache.get(cacheKey);

    try {
        // Google Translate free endpoint (used by many apps)
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${from}&tl=${to}&dt=t&q=${encodeURIComponent(text)}`;

        const response = await fetch(url);
        const data = await response.json();

        if (data && data[0]) {
            // Response format: [[["translated text","original text",null,null,1]],null,"en"]
            let translated = '';
            data[0].forEach((item: any) => {
                if (item[0]) translated += item[0];
            });

            if (translated && !looksCorruptedTranslation(translated)) {
                translationCache.set(cacheKey, translated);
                return translated;
            }
        }
        throw new Error('Google Translate failed');
    } catch (error) {
        console.warn('Google Translate failed, trying MyMemory:', error);
        // Fallback to MyMemory API
        return translateWithMyMemory(text, from, to);
    }
};

// Fallback: MyMemory Translation API
export const translateWithMyMemory = async (text: string, from: string = 'en', to: string = 'hi'): Promise<string> => {
    if (!text || text.trim() === '') return '';

    const cacheKey = `mymem:${from}:${to}:${text}`;
    if (translationCache.has(cacheKey)) return translationCache.get(cacheKey);

    try {
        const response = await fetch(
            `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${from}|${to}`
        );
        const data = await response.json();

        if (data.responseStatus === 200 && data.responseData?.translatedText) {
            const translated = data.responseData.translatedText;
            if (!looksCorruptedTranslation(translated)) {
                translationCache.set(cacheKey, translated);
                return translated;
            }
        }
        return text;
    } catch (error) {
        console.warn('MyMemory also failed:', error);
        return text;
    }
};

// ?? GOOGLE TRANSLITERATION (Hinglish Typing)
// ?? English sound ?? ????? ??? ????? ?? (????: "Cat" -> "???", "School" -> "?????")
export const transliterateWithGoogle = async (text: string): Promise<string> => {
    if (!text || text.trim() === '') return '';

    const cacheKey = `translit:${text}`;
    if (translationCache.has(cacheKey)) return translationCache.get(cacheKey);

    try {
        // Google Input Tools API (Official endpoint used by Chrome extensions)
        const url = `https://inputtools.google.com/request?text=${encodeURIComponent(text)}&itc=hi-t-i0-und&num=1&cp=0&cs=1&ie=utf-8&oe=utf-8`;

        const response = await fetch(url);
        const data = await response.json();

        if (data && data[0] === 'SUCCESS') {
            // Result structure usually: [SUCCESS, [[input, [option1, option2], ...]]]
            // We map over each word result and join them
            let result = "";
            data[1].forEach((wordData: any) => {
                result += wordData[1][0] + " "; // Pick the first (best) suggestion
            });
            const finalResult = result.trim();
            if (!looksCorruptedTranslation(finalResult)) {
                translationCache.set(cacheKey, finalResult);
                return finalResult;
            }
            return text;
        }
        return text; // Fail hone par original text return kare
    } catch (error) {
        console.error("Transliteration Error:", error);
        return text;
    }
};

export const convertToHindiFallback = (text: any) => {
    if (!text) return "";
    const strText = text.toString();
    const fallbackCacheKey = `fallback:${strText}`;
    if (translationCache.has(fallbackCacheKey)) return translationCache.get(fallbackCacheKey);
    try {
        const translated = strText.split(/\s+/).map((word: string) => {
            const lower = word.toLowerCase();
            if (exactDictionary[lower]) return exactDictionary[lower];

            let i = 0;
            let hindiWord = '';
            while (i < lower.length) {
                const char = lower[i];
                const next = lower[i + 1] || '';
                const double = char + next;

                if (soundMap[double] && !['a', 'e', 'i', 'o', 'u'].includes(char)) {
                    hindiWord += soundMap[double];
                    i += 2;
                } else if (soundMap[char]) {
                    if (i === 0 && ['a', 'e', 'i', 'o', 'u'].includes(char)) {
                        if (char === 'a') hindiWord += 'अ';
                        else if (char === 'e') hindiWord += 'ए';
                        else if (char === 'i') hindiWord += 'इ';
                        else if (char === 'o') hindiWord += 'ओ';
                        else if (char === 'u') hindiWord += 'उ';
                    } else {
                        hindiWord += soundMap[char];
                    }
                    i++;
                } else {
                    hindiWord += char;
                    i++;
                }
            }
            return hindiWord || word;
        }).join(' ');

        // Never return/cache corrupted placeholder output (e.g. '????')
        if (looksCorruptedTranslation(translated)) return strText;
        translationCache.set(fallbackCacheKey, translated);
        return translated;
    } catch (err) {
        console.error(err);
        return strText;
    }
};


