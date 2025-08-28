import { useState } from "react";
import "./App.css";
import { useGoogleLogin, googleLogout } from "@react-oauth/google";
import { toast } from "sonner";
import {
  SidebarProvider,
  SidebarTrigger,
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
  SidebarInset,
} from "./components/ui/sidebar";
import { Button } from "./components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "./components/ui/avatar";
import { Badge } from "./components/ui/badge";
import { Separator } from "./components/ui/separator";
import { Progress } from "./components/ui/progress";
import {
  Home,
  Code,
  Palette,
  Shield,
  Zap,
  User,
  LogOut,
  Github,
  Globe,
  Layers,
  Upload,
  Trash2,
  Plus,
  Key,
  Download,
  Save,
} from "lucide-react";
import {
  fetchDriveFiles as fetchFiles,
  downloadDriveFile,
  uploadFileToDrive,
  createDriveFolder,
  deleteDriveFile,
  getFileIcon,
  formatFileSize,
  DriveFile,
  DRIVE_SCOPES,
} from "./lib/googleDrive";
import {
  generateSubstrateAccount,
  accountToPolkadotJson,
  accountFromPolkadotJson,
  SubstrateAccount,
} from "./lib/polkadot";
import {
  loadAccountFromKeystore,
  sendBalanceTransfer,
  initializePolkadotApi,
  getAccountBalance,
  disconnectApi,
  ExtrinsicResult,
} from "./lib/polkadotExtrinsics";

interface UserInfo {
  name: string;
  email: string;
  picture: string;
  sub: string;
}

function App() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [driveFiles, setDriveFiles] = useState<DriveFile[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);
  const [generatedAccount, setGeneratedAccount] =
    useState<SubstrateAccount | null>(null);
  const [isGeneratingKeys, setIsGeneratingKeys] = useState(false);
  const [isSavingKeys, setIsSavingKeys] = useState(false);
  const [isFetchingKeys, setIsFetchingKeys] = useState(false);
  const [isSendingExtrinsic, setIsSendingExtrinsic] = useState(false);
  const [extrinsicResult, setExtrinsicResult] =
    useState<ExtrinsicResult | null>(null);

  // Function to fetch Google Drive files
  const fetchDriveFiles = async (token: string) => {
    setLoadingFiles(true);
    try {
      const data = await fetchFiles(token, 10);
      setDriveFiles(data.files || []);
      toast.success(
        `Loaded ${data.files?.length || 0} files from Google Drive`
      );
    } catch (error) {
      console.error("Error fetching Drive files:", error);
      toast.error("Failed to load Google Drive files");
    } finally {
      setLoadingFiles(false);
    }
  };

  // Function to download a specific file
  const downloadFile = async (fileId: string, fileName: string) => {
    if (!accessToken) return;

    try {
      await downloadDriveFile(accessToken, fileId, fileName);
      toast.success(`Downloaded "${fileName}" successfully`);
    } catch (error) {
      console.error("Error downloading file:", error);
      toast.error(`Failed to download "${fileName}"`);
    }
  };

  // Function to handle file upload
  const handleFileUpload = async (files: FileList | null) => {
    if (!files || !accessToken || files.length === 0) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const fileArray = Array.from(files);
      const fileCount = fileArray.length;

      if (fileCount === 1) {
        toast.info(`Starting upload of "${fileArray[0].name}"...`);
      } else {
        toast.info(`Starting upload of ${fileCount} files...`);
      }

      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i];
        const baseProgress = (i / fileArray.length) * 100;

        await uploadFileToDrive(
          accessToken,
          file,
          undefined, // No specific folder
          (fileProgress) => {
            const totalProgress =
              baseProgress + fileProgress / fileArray.length;
            setUploadProgress(totalProgress);
          }
        );

        if (fileCount === 1) {
          toast.success(`"${file.name}" uploaded successfully!`);
        }
      }

      // Refresh files list after upload
      await fetchDriveFiles(accessToken);
      setUploadProgress(0);

      if (fileCount > 1) {
        toast.success(`All ${fileCount} files uploaded successfully!`);
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      toast.error("Failed to upload files");
    } finally {
      setIsUploading(false);
    }
  };

  // Function to handle file input change
  const handleFileInputChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    handleFileUpload(event.target.files);
    // Reset input value to allow selecting same file again
    event.target.value = "";
  };

  // Function to delete a file
  const deleteFile = async (fileId: string) => {
    if (!accessToken) return;

    // Find the file name for the toast
    const file = driveFiles.find((f) => f.id === fileId);
    const fileName = file?.name || "Unknown file";

    if (!confirm(`Are you sure you want to delete "${fileName}"?`)) {
      return;
    }

    try {
      await deleteDriveFile(accessToken, fileId);
      // Refresh files list after deletion
      await fetchDriveFiles(accessToken);
      toast.success(`Deleted "${fileName}" successfully`);
    } catch (error) {
      console.error("Error deleting file:", error);
      toast.error(`Failed to delete "${fileName}"`);
    }
  };

  // Function to create a new folder
  const createFolder = async () => {
    if (!accessToken) return;

    const folderName = prompt("Enter folder name:");
    if (!folderName) return;

    try {
      await createDriveFolder(accessToken, folderName);
      // Refresh files list after creation
      await fetchDriveFiles(accessToken);
      toast.success(`Created folder "${folderName}" successfully`);
    } catch (error) {
      console.error("Error creating folder:", error);
      toast.error(`Failed to create folder "${folderName}"`);
    }
  };

  const googleLogin = useGoogleLogin({
    scope: `openid profile email ${DRIVE_SCOPES.FULL}`,
    onSuccess: async (tokenResponse) => {
      try {
        setAccessToken(tokenResponse.access_token);
        // Fetch user info using the access token
        const userInfoResponse = await fetch(
          `https://www.googleapis.com/oauth2/v2/userinfo?access_token=${tokenResponse.access_token}`
        );
        const userInfo = await userInfoResponse.json();

        console.log("User info:", userInfo);
        setUser({
          name: userInfo.name,
          email: userInfo.email,
          picture: userInfo.picture,
          sub: userInfo.id,
        });

        toast.success(`Welcome ${userInfo.name}! Connected to Google Drive.`);

        // Automatically fetch Drive files after successful login
        fetchDriveFiles(tokenResponse.access_token);
      } catch (error) {
        console.error("Error fetching user info:", error);
      }
    },
    onError: () => {
      console.log("Login Failed");
    },
  });

  const handleLogout = () => {
    googleLogout();
    setUser(null);
    setAccessToken(null);
    setDriveFiles([]);
    console.log("User logged out");
  };

  const handleGenerateKeys = async () => {
    if (!user) {
      toast.error("Please log in first");
      return;
    }

    setIsGeneratingKeys(true);

    try {
      toast.info("Generating Substrate/Polkadot account...");

      // Generate a new Substrate account
      const account = await generateSubstrateAccount(
        `${user.name} Polkadot Account`,
        "myStr0ngP@ssworD" // You can make this configurable
      );

      setGeneratedAccount(account);

      toast.success(`Account generated successfully!`);
      toast.info(
        `Address: ${account.address.slice(0, 10)}...${account.address.slice(
          -10
        )}`
      );

      console.log("Generated account:", {
        address: account.address,
        mnemonic: account.mnemonic,
        publicKey: account.publicKey,
      });
    } catch (error) {
      console.error("Error generating account:", error);
      toast.error("Failed to generate Substrate account");
    } finally {
      setIsGeneratingKeys(false);
    }
  };

  const handleSaveKeys = async () => {
    if (!generatedAccount) {
      toast.error("No account generated. Please generate keys first.");
      return;
    }

    if (!accessToken) {
      toast.error("Please log in to Google Drive first");
      return;
    }

    setIsSavingKeys(true);

    try {
      toast.info("Saving account keystore to Google Drive...");

      // Convert to standard Polkadot.js keystore format (encrypted, no mnemonic)
      const keystoreJson = accountToPolkadotJson(generatedAccount);

      // Create a blob with the keystore JSON data
      const blob = new Blob([keystoreJson], { type: "application/json" });
      const fileName = `polkadot-keystore-${generatedAccount.address.slice(
        0,
        8
      )}-${Date.now()}.json`;

      // Convert blob to file
      const file = new File([blob], fileName, { type: "application/json" });

      // Upload to Google Drive
      await uploadFileToDrive(accessToken, file);

      // Refresh files list
      await fetchDriveFiles(accessToken);

      toast.success(`Keystore saved to Google Drive as "${fileName}"`);
      toast.info(
        "🔒 Keystore is encrypted with your password. Mnemonic is NOT included for security."
      );
    } catch (error) {
      console.error("Error saving keystore:", error);
      toast.error("Failed to save keystore to Google Drive");
    } finally {
      setIsSavingKeys(false);
    }
  };

  const handleFetchKeys = async () => {
    if (!accessToken) {
      toast.error("Please log in to Google Drive first");
      return;
    }

    setIsFetchingKeys(true);

    try {
      toast.info("Searching for Polkadot account files...");

      // Search for JSON files that contain "polkadot-keystore" (new format)
      let searchQuery =
        "name contains 'polkadot-keystore' and mimeType='application/json'";
      let searchResults = await fetchFiles(
        accessToken,
        10,
        undefined,
        searchQuery
      );

      // If no keystore files found, try old format
      if (searchResults.files.length === 0) {
        searchQuery =
          "name contains 'polkadot-account' and mimeType='application/json'";
        searchResults = await fetchFiles(
          accessToken,
          10,
          undefined,
          searchQuery
        );
      }

      if (searchResults.files.length === 0) {
        toast.warning("No Polkadot account files found in Google Drive");
        return;
      }

      // For demo purposes, let's fetch the first account file
      const accountFile = searchResults.files[0];

      toast.info(`Downloading keystore file: ${accountFile.name}`);

      // Download the file content
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files/${accountFile.id}?alt=media`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to download keystore file");
      }

      const keystoreJsonString = await response.text();
      let account: SubstrateAccount;

      try {
        // Try to parse as standard Polkadot.js keystore format
        account = accountFromPolkadotJson(keystoreJsonString);
        toast.success(
          `Keystore loaded: ${account.address.slice(
            0,
            10
          )}...${account.address.slice(-10)}`
        );
        toast.info(`Account name: ${account.meta.name}`);
        toast.warning("Mnemonic not available (keystore format)");
      } catch (error) {
        // Fallback: try old format that includes mnemonic (deprecated)
        console.warn("Failed to parse as keystore, trying old format:", error);
        const oldAccount = JSON.parse(keystoreJsonString);
        account = oldAccount;
        toast.success(
          `Account loaded: ${account.address.slice(
            0,
            10
          )}...${account.address.slice(-10)}`
        );
        toast.info(`Account name: ${account.meta.name}`);
        if (account.mnemonic) {
          toast.warning(
            "⚠️ This file contains mnemonic in plain text (old insecure format)"
          );
        }
      }

      setGeneratedAccount(account);

      console.log("Loaded account:", {
        address: account.address,
        name: account.meta.name,
        created: account.meta.created,
      });
    } catch (error) {
      console.error("Error fetching account:", error);
      toast.error("Failed to fetch account from Google Drive");
    } finally {
      setIsFetchingKeys(false);
    }
  };

  const handleTestExtrinsic = async () => {
    if (!generatedAccount) {
      toast.error("No account loaded. Please generate or fetch keys first.");
      return;
    }

    if (!generatedAccount.keystoreJson) {
      toast.error(
        "No keystore available. Account needs proper keystore format."
      );
      return;
    }

    setIsSendingExtrinsic(true);
    setExtrinsicResult(null);

    try {
      toast.info("🔗 Connecting to Polkadot test network...");

      // Connect to Gen6 testnet (free test tokens available)
      const api = await initializePolkadotApi({
        wsEndpoint: "wss://gen6.app/node",
      });

      toast.info("🔐 Loading account from keystore...");

      // Load the account from keystore with password
      const senderPair = await loadAccountFromKeystore(
        generatedAccount.keystoreJson,
        "myStr0ngP@ssworD" // The password we used when generating
      );

      console.log(`📍 Loaded account: ${senderPair.address}`);

      // Check balance
      toast.info("💰 Checking account balance...");
      const balance = await getAccountBalance(api, senderPair.address);
      console.log(`Free balance: ${balance.free} GSX`);

      if (balance.free === "0") {
        toast.warning(
          "⚠️ Account has no balance. Please get some tokens."
        );
        toast.info(
          "🚰 Get test tokens"
        );
      }

      // Test recipient address (well-known Alice address)
      const recipientAddress =
        "g6C5XMbPAFmYEF7y9t8xkKgMch8jdfVheZSSJaBL5S6GoUNos";
      const amount = "1000000000000000000"; // 1 GSX (18 decimals)

      toast.info("🚀 Sending test transaction...");

      // Send the transaction
      const result = await sendBalanceTransfer(
        api,
        senderPair,
        recipientAddress,
        amount
      );

      setExtrinsicResult(result);

      if (result.success) {
        toast.success(`✅ Transaction successful!`);
        toast.info(
          `📋 Hash: ${result.hash?.slice(0, 10)}...${result.hash?.slice(-10)}`
        );
        toast.info(
          `🔗 Block: ${result.blockHash?.slice(
            0,
            10
          )}...${result.blockHash?.slice(-10)}`
        );

        console.log("Transaction successful:", {
          hash: result.hash,
          blockHash: result.blockHash,
          events: result.events,
        });
      } else {
        toast.error(`❌ Transaction failed: ${result.error}`);
        console.error("Transaction failed:", result.error);
      }

      // Disconnect
      await disconnectApi(api);
      toast.info("🔌 Disconnected from network");
    } catch (error) {
      console.error("Error sending extrinsic:", error);
      toast.error(
        `Failed to send transaction: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      setExtrinsicResult({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsSendingExtrinsic(false);
    }
  };

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

  // Technology cards data
  const technologies = [
    {
      title: "React",
      description:
        "A JavaScript library for building user interfaces with component-based architecture.",
      icon: "⚛️",
      version: "v19",
      category: "Frontend Framework",
    },
    {
      title: "TypeScript",
      description:
        "A strongly typed programming language that builds on JavaScript.",
      icon: "📘",
      version: "v5.0",
      category: "Programming Language",
    },
    {
      title: "Vite",
      description:
        "Next generation frontend tooling for faster development experience.",
      icon: "⚡",
      version: "v5.0",
      category: "Build Tool",
    },
    {
      title: "Tailwind CSS",
      description:
        "A utility-first CSS framework for rapidly building custom user interfaces.",
      icon: "🎨",
      version: "v3.4",
      category: "CSS Framework",
    },
    {
      title: "shadcn/ui",
      description:
        "Beautifully designed components built with Radix UI and Tailwind CSS.",
      icon: "🎯",
      version: "Latest",
      category: "UI Library",
    },
    {
      title: "Google OAuth",
      description:
        "Secure authentication system using Google's OAuth 2.0 protocol.",
      icon: "🔐",
      version: "v2.0",
      category: "Authentication",
    },
  ];

  const AppSidebar = () => (
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
            onClick={handleLogout}
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

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <h1 className="text-xl font-semibold">Welcome to Tech Dashboard</h1>
        </header>

        <main className="flex-1 space-y-6 p-6">
          {!user ? (
            // Login Section
            <div className="flex items-center justify-center min-h-[400px]">
              <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                    <Shield className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle className="text-2xl">Welcome Back</CardTitle>
                  <CardDescription>
                    Sign in with your Google account to access the dashboard
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-center">
                    <Button
                      onClick={() => googleLogin()}
                      className="w-full max-w-sm"
                      variant="outline"
                      size="lg"
                    >
                      <svg
                        className="mr-2 h-4 w-4"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          fill="#4285F4"
                        />
                        <path
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          fill="#34A853"
                        />
                        <path
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                          fill="#FBBC05"
                        />
                        <path
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                          fill="#EA4335"
                        />
                      </svg>
                      Continue with Google
                    </Button>
                  </div>
                  <div className="text-center text-sm text-muted-foreground">
                    Secure authentication powered by Google OAuth 2.0
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            // Dashboard Content
            <div className="space-y-6">
              {/* User Welcome Card */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={user.picture} alt={user.name} />
                      <AvatarFallback className="text-lg">
                        {user.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="space-y-1">
                      <CardTitle className="text-2xl">
                        Welcome back, {user.name}!
                      </CardTitle>
                      <CardDescription className="text-base">
                        {user.email}
                      </CardDescription>
                      <Badge variant="secondary" className="w-fit">
                        <User className="h-3 w-3 mr-1" />
                        Authenticated User
                      </Badge>
                      <Button
                        onClick={() => {}}
                        variant="outline"
                        size="sm"
                        className="ml-4"
                      >
                        Generate Keys
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>

              {/* App Overview */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Project Status
                    </CardTitle>
                    <Zap className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      Active
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Development environment running
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Technologies
                    </CardTitle>
                    <Code className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {technologies.length}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Modern web technologies
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Components
                    </CardTitle>
                    <Palette className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">20+</div>
                    <p className="text-xs text-muted-foreground">
                      shadcn/ui components available
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Polkadot/Substrate Account Management Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  <h2 className="text-xl font-semibold">
                    Polkadot/Substrate Account Management
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button
                    onClick={handleGenerateKeys}
                    disabled={!user || isGeneratingKeys}
                    className="h-24 flex flex-col gap-2"
                    variant="outline"
                  >
                    <Key className="h-6 w-6" />
                    <span className="text-sm">
                      {isGeneratingKeys ? "Generating..." : "Generate Keys"}
                    </span>
                  </Button>

                  <Button
                    onClick={handleSaveKeys}
                    disabled={!accessToken || !generatedAccount || isSavingKeys}
                    className="h-24 flex flex-col gap-2"
                    variant="outline"
                  >
                    <Save className="h-6 w-6" />
                    <span className="text-sm">
                      {isSavingKeys ? "Saving..." : "Save to Drive"}
                    </span>
                  </Button>

                  <Button
                    onClick={handleFetchKeys}
                    disabled={!accessToken || isFetchingKeys}
                    className="h-24 flex flex-col gap-2"
                    variant="outline"
                  >
                    <Download className="h-6 w-6" />
                    <span className="text-sm">
                      {isFetchingKeys ? "Fetching..." : "Fetch from Drive"}
                    </span>
                  </Button>
                </div>

                {/* Test Extrinsic Button */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    <h3 className="text-lg font-semibold">
                      Test Extrinsic (No Wallet Needed)
                    </h3>
                  </div>

                  <Button
                    onClick={handleTestExtrinsic}
                    disabled={!generatedAccount || isSendingExtrinsic}
                    className="w-full h-16 flex items-center gap-3"
                    variant={generatedAccount ? "default" : "outline"}
                  >
                    <Zap className="h-5 w-5" />
                    <div className="text-left">
                      <div className="font-medium">
                        {isSendingExtrinsic
                          ? "Sending Transaction..."
                          : "Send Test Transaction"}
                      </div>
                      <div className="text-xs opacity-80">
                        Uses keystore JSON + password (no wallet extension)
                      </div>
                    </div>
                  </Button>

                  {extrinsicResult && (
                    <Card
                      className={`border-2 ${
                        extrinsicResult.success
                          ? "border-green-200 bg-green-50"
                          : "border-red-200 bg-red-50"
                      }`}
                    >
                      <CardContent className="pt-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            {extrinsicResult.success ? (
                              <div className="text-green-600">✅ Success</div>
                            ) : (
                              <div className="text-red-600">❌ Failed</div>
                            )}
                          </div>
                          {extrinsicResult.success ? (
                            <div className="space-y-1 text-sm">
                              <p>
                                <strong>Hash:</strong>{" "}
                                <code className="text-xs">
                                  {extrinsicResult.hash}
                                </code>
                              </p>
                              <p>
                                <strong>Block:</strong>{" "}
                                <code className="text-xs">
                                  {extrinsicResult.blockHash}
                                </code>
                              </p>
                              <p className="text-green-700">
                                💡 Transaction sent without browser wallet!
                              </p>
                            </div>
                          ) : (
                            <div className="text-sm text-red-700">
                              <p>
                                <strong>Error:</strong> {extrinsicResult.error}
                              </p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <Card className="border-amber-200 bg-amber-50">
                    <CardContent className="pt-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Zap className="h-4 w-4 text-amber-600" />
                          <h4 className="font-medium text-amber-900">
                            How it works
                          </h4>
                        </div>
                        <div className="space-y-1 text-xs text-amber-800">
                          <p>• Uses your encrypted keystore JSON + password</p>
                          <p>• Connects directly to Westend testnet</p>
                          <p>• Signs transaction with your private key</p>
                          <p>• No browser wallet extension required!</p>
                          <p>
                            • Get test tokens:{" "}
                            <a
                              href="https://paritytech.github.io/polkadot-testnet-faucet/"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="underline"
                            >
                              Westend Faucet
                            </a>
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Security Information */}
                <Card className="border-blue-200 bg-blue-50">
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Shield className="h-5 w-5 text-blue-600" />
                        <h3 className="font-semibold text-blue-900">
                          Security Information
                        </h3>
                      </div>
                      <div className="space-y-2 text-sm text-blue-800">
                        <p>
                          <strong>🔐 Password Usage:</strong> The password
                          encrypts your private key in the keystore JSON file.
                          This is standard Polkadot.js security.
                        </p>
                        <p>
                          <strong>💾 What gets saved:</strong> Only the
                          encrypted keystore (no mnemonic). This file can be
                          imported into Polkadot.js Extension.
                        </p>
                        <p>
                          <strong>🔑 Mnemonic:</strong> Shown only once for
                          backup. Store it securely offline - it's your master
                          key!
                        </p>
                        <p>
                          <strong>📱 Import:</strong> Use the saved JSON file +
                          password to import into any compatible Polkadot
                          wallet.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Generated Account Display */}
                {generatedAccount && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Shield className="h-5 w-5" />
                        Generated Account
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Account Name:
                        </p>
                        <p className="text-sm font-mono">
                          {generatedAccount.meta.name}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Address:
                        </p>
                        <p className="text-xs font-mono break-all bg-muted p-2 rounded">
                          {generatedAccount.address}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Public Key:
                        </p>
                        <p className="text-xs font-mono break-all bg-muted p-2 rounded">
                          {generatedAccount.publicKey}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Mnemonic:
                        </p>
                        {generatedAccount.mnemonic ? (
                          <>
                            <p className="text-xs font-mono break-all bg-red-50 p-2 rounded border border-red-200">
                              {generatedAccount.mnemonic}
                            </p>
                            <p className="text-xs text-red-600 mt-1">
                              ⚠️ Store this mnemonic securely. Anyone with
                              access can control your account.
                            </p>
                          </>
                        ) : (
                          <p className="text-xs text-muted-foreground bg-gray-100 p-2 rounded">
                            🔒 Mnemonic not available (loaded from encrypted
                            keystore)
                          </p>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Created:
                        </p>
                        <p className="text-sm">
                          {new Date(
                            generatedAccount.meta.created
                          ).toLocaleString()}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Google Drive Files Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Globe className="h-5 w-5" />
                    <h2 className="text-xl font-semibold">
                      Google Drive Files
                    </h2>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="file"
                      multiple
                      onChange={handleFileInputChange}
                      className="hidden"
                      id="file-upload"
                      disabled={!accessToken || isUploading}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={createFolder}
                      disabled={!accessToken || isUploading}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      New Folder
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        document.getElementById("file-upload")?.click()
                      }
                      disabled={!accessToken || isUploading}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {isUploading
                        ? `Uploading... ${Math.round(uploadProgress)}%`
                        : "Upload Files"}
                    </Button>
                    <Button
                      onClick={() => fetchDriveFiles(accessToken!)}
                      disabled={!accessToken || loadingFiles}
                      variant="outline"
                      size="sm"
                    >
                      {loadingFiles ? "Loading..." : "Refresh Files"}
                    </Button>
                  </div>
                </div>

                {/* Upload Progress Bar */}
                {isUploading && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Uploading files...</span>
                      <span>{Math.round(uploadProgress)}%</span>
                    </div>
                    <Progress value={uploadProgress} className="w-full" />
                  </div>
                )}

                {driveFiles.length > 0 ? (
                  <div className="grid gap-3">
                    {driveFiles.map((file) => (
                      <Card
                        key={file.id}
                        className="hover:shadow-md transition-shadow"
                      >
                        <CardContent className="flex items-center justify-between p-4">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="flex-shrink-0">
                              {getFileIcon(file.mimeType)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">
                                {file.name}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {formatFileSize(file.size)} •
                                {new Date(
                                  file.modifiedTime
                                ).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2 flex-shrink-0">
                            {file.webViewLink && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  window.open(file.webViewLink, "_blank")
                                }
                              >
                                View
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => downloadFile(file.id, file.name)}
                            >
                              Download
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteFile(file.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                      <Globe className="h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground mb-4">
                        Click "Refresh Files" to load your Google Drive files
                      </p>
                      <Button
                        onClick={() => fetchDriveFiles(accessToken!)}
                        disabled={!accessToken || loadingFiles}
                        variant="outline"
                      >
                        {loadingFiles ? "Loading..." : "Load Drive Files"}
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Technologies Grid */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Code className="h-5 w-5" />
                  <h2 className="text-xl font-semibold">Technologies Stack</h2>
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {technologies.map((tech, index) => (
                    <Card
                      key={index}
                      className="hover:shadow-md transition-shadow"
                    >
                      <CardHeader>
                        <div className="flex items-center gap-3">
                          <div className="text-2xl">{tech.icon}</div>
                          <div className="space-y-1">
                            <CardTitle className="text-lg">
                              {tech.title}
                            </CardTitle>
                            <div className="flex gap-2">
                              <Badge variant="outline">{tech.version}</Badge>
                              <Badge variant="secondary">{tech.category}</Badge>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <CardDescription className="text-sm leading-relaxed">
                          {tech.description}
                        </CardDescription>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Additional Info Cards */}
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Github className="h-5 w-5" />
                      Open Source
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>
                      This project showcases modern React development practices
                      with TypeScript, Vite, and shadcn/ui components. Perfect
                      for learning and building upon.
                    </CardDescription>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Globe className="h-5 w-5" />
                      Features
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      <li>• Google OAuth Authentication</li>
                      <li>• Responsive Dashboard Layout</li>
                      <li>• Modern UI Components</li>
                      <li>• TypeScript Support</li>
                      <li>• Fast Development with Vite</li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

export default App;
