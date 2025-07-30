// src/components/ui/spinner.tsx
import React from "react";

const Spinner: React.FC = () => {
  return (
    <div className="flex justify-center items-center">
      <div className="animate-spin border-t-2 border-blue-500 border-solid rounded-full w-8 h-8"></div>
    </div>
  );
};

export default Spinner;
