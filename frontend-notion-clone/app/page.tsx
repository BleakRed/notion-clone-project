"use client"

import { useEffect, useState } from "react"
import { api } from "@/lib/api"

export default function Page({ pageId }: { pageId: string }) {
  const [md, setMd] = useState("")

  useEffect(() => {
    api.get(`/pages/${pageId}`).then(res => {
      setMd(res.data.content_md)
    })
  }, [])

  return (
    <textarea
      className="w-full h-screen"
      value={md}
      onChange={e => setMd(e.target.value)}
    />
  )
}
