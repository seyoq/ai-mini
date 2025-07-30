import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      "react/jsx-props-no-spreading": "off",  // JSX props spreading 관련 경고 끄기
      "import/prefer-default-export": "off",  // 기본 export 강제 규칙 끄기
      "no-unused-vars": "off",  // 사용되지 않는 변수에 대한 경고 끄기
      "no-console": "off",  // console.log 사용에 대한 경고 끄기
      "react/prop-types": "off",  // prop types 사용 강제 규칙 끄기
      "react/no-array-index-key": "off",  // 배열 인덱스를 key로 사용하는 규칙 끄기
      "react/jsx-no-target-blank": "off",  // target="_blank" 사용에 대한 경고 끄기
      "react/no-unescaped-entities": "off", 
       "@typescript-eslint/no-explicit-any": "off",  // `any` 타입 경고 끄기
      "@typescript-eslint/no-unused-vars": "off",  // 사용되지 않는 변수 경고 끄기
      "@typescript-eslint/no-empty-object-type": "off",  // 비어있는 객체 타입 경고 끄기
    // 특수 문자가 JSX에서 이스케이프되지 않은 경고 끄기
    "react-hooks/exhaustive-deps": "off" // 경고를 끄기
    },
  },
];

export default eslintConfig;
