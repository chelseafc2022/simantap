"use client"

import { ChevronRight, type LucideIcon } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"

export interface NavMainItem {
  title: string
  url: string
  subtitle?: string
  icon?: LucideIcon
  isActive?: boolean
  badge?: string
  colorTheme?: {
    iconBgActive: string
    iconBgInactive: string
    borderActive: string
    activeGlow: string
  }
  items?: {
    title: string
    url: string
    isActive?: boolean
  }[]
}

export function NavMain({
  label,
  items,
}: {
  label: string
  items: NavMainItem[]
}) {
  const pathname = usePathname()

  const shouldBeOpen = (item: NavMainItem) => {
    if (item.isActive) return true
    return item.items?.some((subItem) => pathname === subItem.url) || false
  }

  return (
    <SidebarGroup className="py-1.5">
      <SidebarGroupLabel className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground/75 px-3 py-1 flex items-center gap-1.5 select-none">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/70 shrink-0" />
        <span className="truncate">{label}</span>
      </SidebarGroupLabel>
      <SidebarMenu className="gap-1 mt-0.5">
        {items.map((item) => {
          const isItemActive =
            item.isActive ??
            (pathname === item.url ||
              (item.url !== "/dashboard" && pathname.startsWith(item.url)))
          const theme = item.colorTheme || {
            iconBgActive:
              "bg-gradient-to-br from-emerald-600 to-teal-500 text-white shadow-xs shadow-emerald-500/30",
            iconBgInactive:
              "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover/menu-button:bg-emerald-500/20",
            borderActive: "border-l-emerald-500",
            activeGlow:
              "bg-gradient-to-r from-emerald-500/12 via-emerald-500/5 to-transparent",
          }

          return (
            <Collapsible
              key={item.title}
              asChild
              defaultOpen={shouldBeOpen(item)}
              className="group/collapsible"
            >
              <SidebarMenuItem>
                {item.items?.length ? (
                  <>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton
                        tooltip={item.title}
                        className={cn(
                          "cursor-pointer rounded-xl h-auto py-2 px-2.5 transition-all duration-200 group/menu-button",
                          isItemActive &&
                            cn(
                              theme.activeGlow,
                              "border-l-2 font-semibold",
                              theme.borderActive
                            )
                        )}
                      >
                        <div
                          className={cn(
                            "flex size-7 shrink-0 items-center justify-center rounded-lg transition-all duration-200 group-data-[collapsible=icon]:size-6",
                            isItemActive
                              ? cn(theme.iconBgActive, "scale-105")
                              : theme.iconBgInactive
                          )}
                        >
                          {item.icon && <item.icon className="size-4 shrink-0" />}
                        </div>
                        <div className="flex flex-col text-left leading-tight truncate flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                          <span
                            className={cn(
                              "text-xs truncate transition-colors",
                              isItemActive
                                ? "font-bold text-foreground"
                                : "font-medium text-sidebar-foreground group-hover/menu-button:text-foreground"
                            )}
                          >
                            {item.title}
                          </span>
                          {item.subtitle && (
                            <span className="text-[10px] text-muted-foreground/75 truncate">
                              {item.subtitle}
                            </span>
                          )}
                        </div>
                        <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 group-data-[collapsible=icon]:hidden size-3.5 text-muted-foreground" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub className="ml-5 pl-2 border-l border-sidebar-border/60 gap-1 my-1">
                        {item.items?.map((subItem) => (
                          <SidebarMenuSubItem key={subItem.title}>
                            <SidebarMenuSubButton
                              asChild
                              className="cursor-pointer rounded-lg text-xs"
                              isActive={pathname === subItem.url}
                            >
                              <Link
                                href={subItem.url}
                                target={
                                  item.title === "Auth Pages" ||
                                  item.title === "Errors"
                                    ? "_blank"
                                    : undefined
                                }
                                rel={
                                  item.title === "Auth Pages" ||
                                  item.title === "Errors"
                                    ? "noopener noreferrer"
                                    : undefined
                                }
                              >
                                <span>{subItem.title}</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </>
                ) : (
                  <SidebarMenuButton
                    asChild
                    tooltip={item.title}
                    isActive={isItemActive}
                    className={cn(
                      "cursor-pointer rounded-xl h-auto py-2 px-2.5 transition-all duration-200 group/menu-button",
                      isItemActive &&
                        cn(
                          theme.activeGlow,
                          "border-l-2 font-semibold",
                          theme.borderActive
                        )
                    )}
                  >
                    <Link
                      href={item.url}
                      className="flex items-center gap-2.5 w-full"
                    >
                      <div
                        className={cn(
                          "flex size-7 shrink-0 items-center justify-center rounded-lg transition-all duration-200 group-data-[collapsible=icon]:size-6",
                          isItemActive
                            ? cn(theme.iconBgActive, "scale-105")
                            : theme.iconBgInactive
                        )}
                      >
                        {item.icon && <item.icon className="size-4 shrink-0" />}
                      </div>
                      <div className="flex flex-col text-left leading-tight truncate flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                        <div className="flex items-center justify-between gap-1">
                          <span
                            className={cn(
                              "text-xs truncate transition-colors",
                              isItemActive
                                ? "font-bold text-foreground"
                                : "font-medium text-sidebar-foreground group-hover/menu-button:text-foreground"
                            )}
                          >
                            {item.title}
                          </span>
                          {item.badge && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded-full font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                              {item.badge}
                            </span>
                          )}
                        </div>
                        {item.subtitle && (
                          <span className="text-[10px] text-muted-foreground/75 truncate mt-0.5">
                            {item.subtitle}
                          </span>
                        )}
                      </div>
                      {isItemActive && !item.badge && (
                        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-xs shadow-emerald-500/50 group-data-[collapsible=icon]:hidden shrink-0" />
                      )}
                    </Link>
                  </SidebarMenuButton>
                )}
              </SidebarMenuItem>
            </Collapsible>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}
