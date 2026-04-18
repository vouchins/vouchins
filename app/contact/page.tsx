"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  Send,
  MessageSquare,
  MapPin,
  Mail,
  Linkedin,
  Instagram,
  Twitter,
  Facebook,
} from "lucide-react";

export default function ContactPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    type: "",
    message: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      setMessage({
        type: "success",
        text: "Thank you for your feedback! Our team will review it shortly.",
      });
      setFormData({ name: "", email: "", type: "", message: "" });
    } catch (err: any) {
      setMessage({
        type: "error",
        text: err.message || "Something went wrong. Please try again later.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <header className="border-b border-neutral-200 bg-white/80 backdrop-blur sticky top-0 z-20">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center space-x-3">
              <Link href="/">
                <Image
                  src="/images/logo.png"
                  alt="Vouchins"
                  width={140}
                  height={40}
                  className="object-contain"
                  priority
                />
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="flex items-center justify-center bg-neutral-50 px-4 py-16 min-h-[calc(100vh-16vh)]">
        <div className="w-full max-w-5xl">
          <div className="mb-8">
            <Link
              href="/"
              className="inline-flex items-center text-sm text-neutral-500 hover:text-neutral-900 mb-6 transition-colors"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to home
            </Link>

            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                <MessageSquare className="h-6 w-6" />
              </div>
              <h1 className="text-3xl font-bold text-neutral-900 tracking-tight">
                Contact Us
              </h1>
            </div>
            <p className="text-neutral-600 font-medium">
              Have a question, feature request, or found a bug? We'd love to
              hear from you.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-white rounded-2xl border border-neutral-200 p-8 shadow-sm">
              {message && (
                <Alert
                  variant={message.type === "error" ? "destructive" : "default"}
                  className={`mb-6 ${message.type === "success" ? "border-green-200 bg-green-50 text-green-800" : ""}`}
                >
                  {message.type === "error" ? (
                    <AlertCircle className="h-4 w-4" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  )}
                  <AlertDescription className="font-medium">
                    {message.text}
                  </AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label htmlFor="name">Your Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      placeholder="Enter your name"
                      required
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      placeholder="you@company.com"
                      required
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>What is this regarding?</Label>
                  <Select
                    required
                    value={formData.type}
                    onValueChange={(val) =>
                      setFormData({ ...formData, type: val })
                    }
                    disabled={loading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a topic" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General Inquiry</SelectItem>
                      <SelectItem value="feature">Feature Request</SelectItem>
                      <SelectItem value="bug">Bug Report</SelectItem>
                      <SelectItem value="trust">
                        Trust & Safety Concern
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Message</Label>
                  <Textarea
                    id="message"
                    value={formData.message}
                    onChange={(e) =>
                      setFormData({ ...formData, message: e.target.value })
                    }
                    placeholder="How can we help you?"
                    className="min-h-[120px] resize-y"
                    required
                    disabled={loading}
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full h-11 text-base font-bold shadow-sm"
                  disabled={loading}
                >
                  {loading ? (
                    "Sending..."
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" /> Send Message
                    </>
                  )}
                </Button>
              </form>
            </div>

            <div className="flex flex-col gap-6">
              <div className="bg-white rounded-2xl border border-neutral-200 p-8 shadow-sm space-y-8">
                <div>
                  <h3 className="text-xl font-bold text-neutral-900 mb-4">
                    Contact Information
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <MapPin className="h-5 w-5 text-indigo-600 mt-0.5 shrink-0" />
                      <p className="text-sm text-neutral-600 leading-relaxed">
                        C/O Edventure park, beside NMDC - Vijaya Nagar Colony
                        Road, NMDC Colony, Venkatadri Colony, Masab Tank,
                        Hyderabad, Telangana 500006.
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Mail className="h-5 w-5 text-indigo-600 shrink-0" />
                      <a
                        href="mailto:connect@vouchins.com"
                        className="text-sm text-neutral-600 hover:text-indigo-600 transition-colors"
                      >
                        connect@vouchins.com
                      </a>
                    </div>
                  </div>
                </div>

                <hr className="border-neutral-100" />

                <div>
                  <h4 className="text-sm font-bold text-neutral-900 mb-4">
                    Follow Us
                  </h4>
                  <div className="flex items-center gap-4">
                    <a
                      href="https://www.linkedin.com/company/vouchins"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 bg-neutral-50 text-neutral-600 hover:bg-[#0A66C2] hover:text-white rounded-full transition-all"
                    >
                      <Linkedin className="h-5 w-5" />
                    </a>
                    <a
                      href="https://www.instagram.com/vouchins"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 bg-neutral-50 text-neutral-600 hover:bg-[#E1306C] hover:text-white rounded-full transition-all"
                    >
                      <Instagram className="h-5 w-5" />
                    </a>
                    <a
                      href="https://www.x.com/vouchins"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 bg-neutral-50 text-neutral-600 hover:bg-black hover:text-white rounded-full transition-all"
                    >
                      <Twitter className="h-5 w-5" />
                    </a>
                    <a
                      href="https://www.facebook.com/vouchins/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 bg-neutral-50 text-neutral-600 hover:bg-[#1877F2] hover:text-white rounded-full transition-all"
                    >
                      <Facebook className="h-5 w-5" />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
