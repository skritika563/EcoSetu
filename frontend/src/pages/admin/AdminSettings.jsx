/**
 * AdminSettings — platform configuration, integrations overview, and security environment status.
 */
import { Shield, Server, Key, Database, Sparkles, Image, CreditCard } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const AdminSettings = () => {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Platform Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          System environment, security policies, and third-party integration diagnostics
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* System & Architecture Info */}
        <div className="space-y-4 rounded-xl border border-border/60 bg-card p-6 shadow-sm">
          <h2 className="font-heading text-base font-semibold text-foreground flex items-center gap-2">
            <Server className="h-4 w-4 text-primary" /> Environment & Architecture
          </h2>

          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between border-b border-border/30 pb-2">
              <span className="text-muted-foreground">Environment</span>
              <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 bg-emerald-50/50">
                Production-Ready
              </Badge>
            </div>
            <div className="flex items-center justify-between border-b border-border/30 pb-2">
              <span className="text-muted-foreground">Database Engine</span>
              <span className="font-medium text-foreground">MongoDB Atlas (Mongoose ODM)</span>
            </div>
            <div className="flex items-center justify-between border-b border-border/30 pb-2">
              <span className="text-muted-foreground">Authentication Authority</span>
              <span className="font-medium text-foreground">Firebase Auth SDK (JWT Token)</span>
            </div>
            <div className="flex items-center justify-between border-b border-border/30 pb-2">
              <span className="text-muted-foreground">Session Expiration</span>
              <span className="font-medium text-foreground">1 Hour (Auto-refreshed by SDK)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">CO₂ Formula Constant</span>
              <span className="font-medium text-foreground">2.6 kg CO₂ / kg scrap</span>
            </div>
          </div>
        </div>

        {/* Security & Access Policies */}
        <div className="space-y-4 rounded-xl border border-border/60 bg-card p-6 shadow-sm">
          <h2 className="font-heading text-base font-semibold text-foreground flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" /> Access Control & Security
          </h2>

          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between border-b border-border/30 pb-2">
              <span className="text-muted-foreground">Admin Provisioning</span>
              <Badge variant="secondary">Server Allowlist (ADMIN_EMAILS)</Badge>
            </div>
            <div className="flex items-center justify-between border-b border-border/30 pb-2">
              <span className="text-muted-foreground">Role Hierarchy</span>
              <span className="font-medium text-foreground">Server-Gated RBAC</span>
            </div>
            <div className="flex items-center justify-between border-b border-border/30 pb-2">
              <span className="text-muted-foreground">Destructive Actions Policy</span>
              <span className="font-medium text-foreground">Soft-Delete (isActive: false)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Audit Trail</span>
              <span className="font-medium text-emerald-600">Active (Append-Only)</span>
            </div>
          </div>
        </div>

        {/* Connected Services Status */}
        <div className="space-y-4 rounded-xl border border-border/60 bg-card p-6 shadow-sm md:col-span-2">
          <h2 className="font-heading text-base font-semibold text-foreground flex items-center gap-2">
            <Key className="h-4 w-4 text-primary" /> Integrations & APIs
          </h2>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Firebase */}
            <div className="rounded-lg border border-border/40 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <Database className="h-5 w-5 text-amber-500" />
                <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                  Connected
                </Badge>
              </div>
              <p className="font-semibold text-sm text-foreground">Firebase Admin</p>
              <p className="text-xs text-muted-foreground">Token verification & auth identity</p>
            </div>

            {/* Cloudinary */}
            <div className="rounded-lg border border-border/40 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <Image className="h-5 w-5 text-blue-500" />
                <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                  Connected
                </Badge>
              </div>
              <p className="font-semibold text-sm text-foreground">Cloudinary Media</p>
              <p className="text-xs text-muted-foreground">Scrap photos & campaign banners</p>
            </div>

            {/* Razorpay */}
            <div className="rounded-lg border border-border/40 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <CreditCard className="h-5 w-5 text-indigo-500" />
                <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                  Active
                </Badge>
              </div>
              <p className="font-semibold text-sm text-foreground">Razorpay Payments</p>
              <p className="text-xs text-muted-foreground">Marketplace checkout & payouts</p>
            </div>

            {/* Gemini AI */}
            <div className="rounded-lg border border-border/40 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <Sparkles className="h-5 w-5 text-purple-500" />
                <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                  Configured
                </Badge>
              </div>
              <p className="font-semibold text-sm text-foreground">Gemini 2.5 AI</p>
              <p className="text-xs text-muted-foreground">Visual scrap classification</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;
