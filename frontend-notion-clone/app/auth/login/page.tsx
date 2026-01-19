"use client"

import { useState } from "react"
import { api } from "@/lib/api"

export default function Login() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  const submit = async () => {
    const res = await api.post("/auth/login", null, {
      params: { email, password }
    })
    localStorage.setItem("token", res.data.access_token)
  }

  return (
    <div className="p-8">
      <input onChange={e => setEmail(e.target.value)} placeholder="Email" />
      <input type="password" onChange={e => setPassword(e.target.value)} />
      <button onClick={submit}>Login</button>
    </div>
  )
}
