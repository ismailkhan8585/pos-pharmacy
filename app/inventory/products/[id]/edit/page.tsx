"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { ProductForm } from "@/app/inventory/products/new/page"

export default function EditProductPage() {
  const params = useParams()
  const [product, setProduct] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const id = params?.id as string
    if (!id) return

    supabase
      .from("products")
      .select("*")
      .eq("id", id)
      .single()
      .then(({ data }) => {
        setProduct(data)
        setIsLoading(false)
      })
  }, [params])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return <ProductForm isEdit initialData={product} />
}
