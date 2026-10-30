import { Suspense } from "react";
import AuthForm from "@/components/AuthForm";

export default function RegisterPage() {
  return <Suspense fallback={<main className="min-h-screen bg-[#090909]" />}><AuthForm mode="register" /></Suspense>;
}
