import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "./ui/sidebar";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Code, Home, Layers, LogOut } from "lucide-react";

interface UserInfo {
  name: string;
  email: string;
  picture: string;
  sub: string;
}

interface AppSidebarProps {
  user: UserInfo | null;
  onLogout: () => void;
}

// Sidebar navigation items
const navigationItems = [
  {
    title: "Dashboard",
    url: "#",
    icon: Home,
  },
  {
    title: "Technologies",
    url: "#",
    icon: Code,
  },
  {
    title: "Components",
    url: "#",
    icon: Layers,
  },
];

export function AppSidebar({ user, onLogout }: AppSidebarProps) {
  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Code className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Tech Dashboard</h2>
            <p className="text-xs text-muted-foreground">Modern React App</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <a href={item.url} className="flex items-center gap-2">
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {user && (
          <SidebarGroup>
            <SidebarGroupLabel>User</SidebarGroupLabel>
            <SidebarGroupContent>
              <div className="p-3 rounded-md bg-muted/50">
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.picture} alt={user.name} />
                    <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{user.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {user.email}
                    </p>
                  </div>
                </div>
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="p-4">
        {user ? (
          <Button
            onClick={onLogout}
            variant="outline"
            size="sm"
            className="w-full"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground text-center">
              Sign in to access features
            </p>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
