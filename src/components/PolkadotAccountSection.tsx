import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
import { Shield, Key, Save, Download, Zap } from "lucide-react";
import { SubstrateAccount } from "../lib/polkadot";
import { ExtrinsicResult } from "../lib/polkadotExtrinsics";

interface UserInfo {
  name: string;
  email: string;
  picture: string;
  sub: string;
}

interface PolkadotAccountSectionProps {
  user: UserInfo | null;
  accessToken: string | null;
  generatedAccount: SubstrateAccount | null;
  isGeneratingKeys: boolean;
  isSavingKeys: boolean;
  isFetchingKeys: boolean;
  isSendingExtrinsic: boolean;
  extrinsicResult: ExtrinsicResult | null;
  onGenerateKeys: () => void;
  onSaveKeys: () => void;
  onFetchKeys: () => void;
  onTestExtrinsic: () => void;
}

export function PolkadotAccountSection({
  user,
  accessToken,
  generatedAccount,
  isGeneratingKeys,
  isSavingKeys,
  isFetchingKeys,
  isSendingExtrinsic,
  extrinsicResult,
  onGenerateKeys,
  onSaveKeys,
  onFetchKeys,
  onTestExtrinsic,
}: PolkadotAccountSectionProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Shield className="h-5 w-5" />
        <h2 className="text-xl font-semibold">
          Polkadot/Substrate Account Management
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Button
          onClick={onGenerateKeys}
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
          onClick={onSaveKeys}
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
          onClick={onFetchKeys}
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

      {/* Test Extrinsic Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          <h3 className="text-lg font-semibold">
            Test Extrinsic (No Wallet Needed)
          </h3>
        </div>

        <Button
          onClick={onTestExtrinsic}
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
                      <code className="text-xs">{extrinsicResult.hash}</code>
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
      </div>

      {/* Security Information */}
      {/* <Card className="border-blue-200 bg-blue-50">
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
                <strong>🔐 Password Usage:</strong> The password encrypts your
                private key in the keystore JSON file. This is standard
                Polkadot.js security.
              </p>
              <p>
                <strong>💾 What gets saved:</strong> Only the encrypted keystore
                (no mnemonic). This file can be imported into Polkadot.js
                Extension.
              </p>
              <p>
                <strong>🔑 Mnemonic:</strong> Shown only once for backup. Store
                it securely offline - it's your master key!
              </p>
              <p>
                <strong>📱 Import:</strong> Use the saved JSON file + password
                to import into any compatible Polkadot wallet.
              </p>
            </div>
          </div>
        </CardContent>
      </Card> */}

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
              <p className="text-sm font-mono">{generatedAccount.meta.name}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Address:
              </p>
              <p className="text-xs font-mono break-all bg-muted p-2 rounded">
                {generatedAccount.address}
              </p>
            </div>
            {/* <div>
              <p className="text-sm font-medium text-muted-foreground">
                Public Key:
              </p>
              <p className="text-xs font-mono break-all bg-muted p-2 rounded">
                {generatedAccount.publicKey}
              </p>
            </div> */}
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
                    ⚠️ Store this mnemonic securely. Anyone with access can
                    control your account.
                  </p>
                </>
              ) : (
                <p className="text-xs text-muted-foreground bg-gray-100 p-2 rounded">
                  🔒 Mnemonic not available (loaded from encrypted keystore)
                </p>
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Created:
              </p>
              <p className="text-sm">
                {new Date(generatedAccount.meta.created).toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
