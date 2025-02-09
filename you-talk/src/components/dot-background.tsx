"use client"

import { useTheme } from "next-themes"
import { useEffect, useRef } from "react"

export function DotBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { theme } = useTheme()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const resizeCanvas = () => {
      const scale = window.devicePixelRatio
      canvas.width = window.innerWidth * scale
      canvas.height = window.innerHeight * scale
      canvas.style.width = `${window.innerWidth}px`
      canvas.style.height = `${window.innerHeight}px`
      ctx.scale(scale, scale)
    }

    resizeCanvas()
    window.addEventListener("resize", resizeCanvas)

    const drawDots = () => {
      if (!ctx || !canvas) return

      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const spacing = 25
      const dotSize = 1.5

      for (let x = spacing; x < window.innerWidth; x += spacing) {
        for (let y = spacing; y < window.innerHeight; y += spacing) {
          ctx.beginPath()
          ctx.arc(x, y, dotSize, 0, Math.PI * 2)
          ctx.fillStyle = theme === "dark" ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.1)"
          ctx.fill()
        }
      }
    }

    drawDots()
    window.addEventListener("resize", drawDots)

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      const radius = 100

      ctx.clearRect(0, 0, canvas.width, canvas.height)
      drawDots()

      const spacing = 25
      for (let dotX = spacing; dotX < window.innerWidth; dotX += spacing) {
        for (let dotY = spacing; dotY < window.innerHeight; dotY += spacing) {
          const distance = Math.sqrt(Math.pow(x - dotX, 2) + Math.pow(y - dotY, 2))
          if (distance < radius) {
            const opacity = 1 - distance / radius
            ctx.beginPath()
            ctx.arc(dotX, dotY, 2, 0, Math.PI * 2)
            ctx.fillStyle = theme === "dark" ? `rgba(74, 222, 128, ${opacity})` : `rgba(5, 150, 105, ${opacity})`
            ctx.fill()
          }
        }
      }
    }

    canvas.addEventListener("mousemove", handleMouseMove)

    return () => {
      window.removeEventListener("resize", resizeCanvas)
      window.removeEventListener("resize", drawDots)
      canvas.removeEventListener("mousemove", handleMouseMove)
    }
  }, [theme])

  return <canvas ref={canvasRef} className="fixed inset-0 w-full h-full -z-10" style={{ position: "fixed" }} />
}

