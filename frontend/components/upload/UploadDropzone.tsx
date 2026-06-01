"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type UploadDropzoneProps = {
  getRootProps: <T extends object>(props?: T) => T;
  getInputProps: <T extends object>(props?: T) => T;
  isDragActive: boolean;
  disabled?: boolean;
  icon: LucideIcon;
  title: string;
  subtitle: string;
  footer?: ReactNode;
};

export default function UploadDropzone({
  getRootProps,
  getInputProps,
  isDragActive,
  disabled,
  icon: Icon,
  title,
  subtitle,
  footer,
}: UploadDropzoneProps) {
  return (
    <div
      {...getRootProps()}
      className={`relative rounded-2xl cursor-pointer transition-colors ${
        disabled ? "opacity-50 cursor-not-allowed" : ""
      }`}
    >
      <input {...getInputProps()} />

      <motion.div
        animate={
          isDragActive
            ? {
                borderColor: [
                  "rgba(124, 111, 247, 0.9)",
                  "rgba(124, 111, 247, 0.35)",
                  "rgba(124, 111, 247, 0.9)",
                ],
                boxShadow: [
                  "0 0 24px rgba(124, 111, 247, 0.2)",
                  "0 0 48px rgba(124, 111, 247, 0.35)",
                  "0 0 24px rgba(124, 111, 247, 0.2)",
                ],
              }
            : {
                borderColor: "rgba(255, 255, 255, 0.12)",
                boxShadow: "0 0 0 rgba(124, 111, 247, 0)",
              }
        }
        transition={
          isDragActive
            ? { duration: 1.5, repeat: Infinity, ease: "easeInOut" }
            : { duration: 0.3 }
        }
        className="border-2 border-dashed rounded-2xl p-12 sm:p-16 text-center bg-elevated/30 hover:bg-accent-muted/10"
      >
        {isDragActive && (
          <motion.div
            className="absolute inset-0 rounded-2xl pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              background:
                "radial-gradient(ellipse at center, rgba(124, 111, 247, 0.15) 0%, transparent 70%)",
            }}
          />
        )}

        <div className="relative z-10">
          <div
            className={`mx-auto w-16 h-16 rounded-2xl flex items-center justify-center mb-5 transition-all ${
              isDragActive ? "bg-accent shadow-glow" : "bg-accent-muted"
            }`}
          >
            <Icon className={`w-8 h-8 ${isDragActive ? "text-white" : "text-accent"}`} />
          </div>
          <p className="text-base font-semibold text-foreground">{title}</p>
          <p className="text-sm text-foreground-secondary mt-2 max-w-sm mx-auto">{subtitle}</p>
          {footer}
        </div>
      </motion.div>
    </div>
  );
}
