"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { apiClient } from "@/lib/api-client"
import { ApiResponse } from "@/types/api"
import { LoginResponseData } from "@/types/auth"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { ShieldCheck, Lock, User, Loader2, Sparkles } from "lucide-react"
import { toast } from "sonner"

export default function LoginPage() {
  const router = useRouter()
  const { login } = useAuth()

  const [identifier, setIdentifier] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!identifier.trim() || !password.trim()) {
      toast.error("NIP / Username dan Password wajib diisi")
      return
    }

    setLoading(true)
    try {
      const response = await apiClient.post<ApiResponse<LoginResponseData>>("/auth/login", {
        identifier: identifier.trim(),
        password,
      })

      if (response.data?.data) {
        login(response.data.data)
        toast.success(`Selamat datang, ${response.data.data.user.namaLengkap}!`)
        router.push("/dashboard")
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || "Gagal melakukan login. Periksa NIP/password Anda."
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const fillDemo = (nip: string) => {
    setIdentifier(nip)
    setPassword("Password123!")
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background p-4">
      <div className="w-full max-w-md space-y-4">
        {/* Header Branding */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center justify-center p-2.5 rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-500/20 mb-2">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            SIMANTAP
          </h1>
          <p className="text-xs text-muted-foreground">
            Sistem Informasi Monitoring dan Evaluasi Data Pembangunan Terpadu
          </p>
          <div className="flex items-center justify-center gap-1.5 pt-1">
            <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-500/30">
              Pemerintah Kabupaten Konawe Selatan
            </Badge>
          </div>
        </div>

        {/* Login Card */}
        <Card className="border-border/60 shadow-lg">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-lg font-semibold">Masuk ke Sistem</CardTitle>
            <CardDescription className="text-xs">
              Gunakan NIP ASN (Server E-Gov & SIMPEG) atau akun Administrator lokal.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleLogin}>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">NIP / Username / Email</Label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Contoh: 198001012005011001"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="pl-9 text-xs h-10"
                    disabled={loading}
                    autoComplete="username"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">Password</Label>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="password"
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9 text-xs h-10"
                    disabled={loading}
                    autoComplete="current-password"
                  />
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-3 pt-2">
              <Button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium h-10 text-xs"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Memverifikasi...
                  </>
                ) : (
                  "Masuk ke Dashboard"
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>

        {/* Demo Quick-Fill Accounts */}
        <div className="rounded-xl border border-border/60 bg-card p-3 space-y-2 text-xs">
          <div className="flex items-center gap-1.5 text-muted-foreground font-medium text-[11px]">
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            <span>Akun Uji Coba Cepat (Password: Password123!)</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => { fillDemo("riswan28"); }}
              className="text-[10px] h-7 justify-start truncate bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 col-span-2 font-semibold"
            >
              🌟 Riswan M. Rizal (username: riswan28 / NIP: 199506082024211001)
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fillDemo("198001012005011001")}
              className="text-[10px] h-7 justify-start truncate"
            >
              👑 Administrator Utama
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fillDemo("198804122011011003")}
              className="text-[10px] h-7 justify-start truncate"
            >
              📑 Admin SiRUP (PU)
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fillDemo("198607142010011002")}
              className="text-[10px] h-7 justify-start truncate"
            >
              🎯 Admin Perencanaan
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fillDemo("198209212008011004")}
              className="text-[10px] h-7 justify-start truncate"
            >
              🏗️ Admin PPK
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
