import { useState } from "react";
import "./App.css";
import { useGoogleLogin, googleLogout } from "@react-oauth/google";
import { toast } from "sonner";
import {
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
} from "./components/ui/sidebar";
import { Separator } from "./components/ui/separator";
import {
  fetchDriveFiles as fetchFiles,
  downloadDriveFile,
  uploadFileToDrive,
  createDriveFolder,
  deleteDriveFile,
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

// Import our new components
import { AppSidebar } from "./components/AppSidebar";
import { LoginSection } from "./components/LoginSection";
import { UserWelcomeCard } from "./components/UserWelcomeCard";
import { PolkadotAccountSection } from "./components/PolkadotAccountSection";
import { GoogleDriveSection } from "./components/GoogleDriveSection";

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
      const data = await fetchFiles(token, 5);
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

  return (
    <SidebarProvider>
      <AppSidebar user={user} onLogout={handleLogout} />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <h1 className="text-xl font-semibold">Welcome to Tech Dashboard</h1>
        </header>

        <main className="flex-1 space-y-6 p-6">
          {!user ? (
            <LoginSection onLogin={() => googleLogin()} />
          ) : (
            <div className="space-y-6">
              {/* User Welcome Card */}
              <UserWelcomeCard user={user} />

              {/* Polkadot/Substrate Account Management Section */}
              <PolkadotAccountSection
                user={user}
                accessToken={accessToken}
                generatedAccount={generatedAccount}
                isGeneratingKeys={isGeneratingKeys}
                isSavingKeys={isSavingKeys}
                isFetchingKeys={isFetchingKeys}
                isSendingExtrinsic={isSendingExtrinsic}
                extrinsicResult={extrinsicResult}
                onGenerateKeys={handleGenerateKeys}
                onSaveKeys={handleSaveKeys}
                onFetchKeys={handleFetchKeys}
                onTestExtrinsic={handleTestExtrinsic}
              />

              {/* Google Drive Files Section */}
              <GoogleDriveSection
                accessToken={accessToken}
                driveFiles={driveFiles}
                loadingFiles={loadingFiles}
                uploadProgress={uploadProgress}
                isUploading={isUploading}
                onRefreshFiles={() => fetchDriveFiles(accessToken!)}
                onFileUpload={handleFileInputChange}
                onCreateFolder={createFolder}
                onDownloadFile={downloadFile}
                onDeleteFile={deleteFile}
              />
            </div>
          )}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

export default App;
