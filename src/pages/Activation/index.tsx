import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { KeyRound, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { TitleBar } from '@/components/layout/TitleBar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useSettingsStore } from '@/stores/settings';
import { invokeIpc } from '@/lib/api-client';
import { hostApiFetch } from '@/lib/host-api';
import { toast } from 'sonner';
import clawxIcon from '@/assets/logo.svg';

const CDK_DEFAULT_BASE_URL = 'http://43.153.204.36:8317/';
const CDK_DEFAULT_MODEL = 'gpt-5.2-codex';

export function Activation() {
  const navigate = useNavigate();
  const [cdk, setCdk] = useState('');
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [checking, setChecking] = useState(true);

  const setCdkVerified = useSettingsStore((state) => state.setCdkVerified);
  const setCdkStore = useSettingsStore((state) => state.setCdk);
  const markSetupComplete = useSettingsStore((state) => state.markSetupComplete);

  useEffect(() => {
    (async () => {
      try {
        const status = await invokeIpc('cdk:getStatus') as { cdk: string; cdkVerified: boolean };
        if (status.cdkVerified) {
          await setupDefaultProvider(status.cdk || '');
          setCdkVerified(true);
          setCdkStore(status.cdk || '');
          markSetupComplete();
          navigate('/');
          return;
        }
      } catch {
        // Ignore errors, show activation page
      }
      setChecking(false);
    })();
  }, [navigate, setCdkStore, setCdkVerified, markSetupComplete]);

  const handleActivate = async () => {
    if (!cdk.trim()) {
      setError('Please enter your CDK');
      return;
    }

    setValidating(true);
    setError(null);

    try {
      const result = await invokeIpc('cdk:verify', cdk) as { 
        success: boolean; 
        error?: string; 
        cdk?: string;
        expired?: boolean;
        expirationDate?: string;
        networkError?: boolean;
      };
      
      if (!result.success) {
        if (result.networkError) {
          await invokeIpc('dialog:message', {
            type: 'error',
            title: 'Activation Failed',
            message: 'Network Error',
            detail: result.error || 'Unable to verify CDK. Please check your internet connection.'
          });
        } else {
          await invokeIpc('dialog:message', {
            type: 'error',
            title: 'Activation Failed',
            message: 'Invalid CDK',
            detail: result.error || 'The CDK you entered is not valid. Please contact support.'
          });
        }
        
        await invokeIpc('app:quit');
        return;
      }

      const decoded = await invokeIpc('cdk:decode', result.cdk || cdk.trim()) as {
        valid: boolean;
        apiKey?: string;
        error?: string;
      };

      if (!decoded.valid || !decoded.apiKey) {
        setError(decoded.error || 'Failed to decode CDK');
        setValidating(false);
        return;
      }
      
      await setupDefaultProvider(decoded.apiKey);
      
      setCdkStore(result.cdk || cdk.trim());
      setCdkVerified(true);
      markSetupComplete();
      setSuccess(true);
      toast.success('Activation successful!');
      
      setTimeout(() => {
        navigate('/');
      }, 1500);
    } catch (err) {
      setError(String(err));
      setValidating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !validating) {
      handleActivate();
    }
  };

  const handleCdkChange = (value: string) => {
    const trimmed = value.trim();
    const parts = trimmed.split('-');
    
    // Detect format: 6-segment (base62, case-sensitive) or 4-segment (legacy, uppercase)
    const is6Segment = parts.length > 4 || (trimmed.length > 19 && !trimmed.includes('-'));
    
    if (is6Segment) {
      // 6-segment format: preserve case (base62 is case-sensitive)
      const formatted = trimmed.replace(/[^A-Za-z0-9]/g, '');
      let result = '';
      for (let i = 0; i < formatted.length && i < 24; i++) {
        if (i > 0 && i % 4 === 0) result += '-';
        result += formatted[i];
      }
      setCdk(result);
    } else {
      // Legacy 4-segment format: uppercase
      const formatted = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
      let result = '';
      for (let i = 0; i < formatted.length && i < 16; i++) {
        if (i > 0 && i % 4 === 0) result += '-';
        result += formatted[i];
      }
      setCdk(result);
    }
    setError(null);
  };

  if (checking) {
    return (
      <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
        <TitleBar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
      <TitleBar />
      <div className="flex-1 flex items-center justify-center overflow-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md p-8"
        >
          <div className="rounded-xl bg-card text-card-foreground border shadow-sm p-8">
            <div className="text-center mb-8">
              <div className="mb-4 flex justify-center">
                <img src={clawxIcon} alt="ClawX" className="h-16 w-16" />
              </div>
              <div className="flex items-center justify-center gap-2 mb-2">
                <KeyRound className="h-6 w-6 text-primary" />
                <h1 className="text-2xl font-bold">Activate ClawX</h1>
              </div>
              <p className="text-muted-foreground">
                Enter your CDK to activate the application
              </p>
            </div>

            {success ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-8"
              >
                <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-green-500 mb-2">
                  Activation Successful!
                </h2>
                <p className="text-muted-foreground">
                  Starting ClawX...
                </p>
              </motion.div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="cdk">CDK (Activation Key)</Label>
                  <Input
                    id="cdk"
                    type="text"
                    placeholder="XXXX-XXXX-XXXX-XXXX or XXXX-XXXX-XXXX-XXXX-XXXX-XXXX"
                    value={cdk}
                    onChange={(e) => handleCdkChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={validating}
                    className={cn(
                      'bg-background border-input text-center tracking-widest font-mono',
                      error && 'border-red-500'
                    )}
                    autoComplete="off"
                    maxLength={29}
                  />
                </div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 text-red-500 text-sm"
                  >
                    <AlertCircle className="h-4 w-4" />
                    <span>{error}</span>
                  </motion.div>
                )}

                <Button
                  onClick={handleActivate}
                  disabled={validating || cdk.replace(/-/g, '').length < 16}
                  className="w-full"
                >
                  {validating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Activating...
                    </>
                  ) : (
                    'Activate'
                  )}
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                  Format: XXXX-XXXX-XXXX-XXXX (letters and numbers)
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

async function setupDefaultProvider(cdk: string): Promise<void> {
  const accountId = 'cdk-default';
  const accountPayload = {
    id: accountId,
    vendorId: 'custom',
    label: 'CDK Provider',
    authMode: 'api_key',
    baseUrl: CDK_DEFAULT_BASE_URL,
    model: CDK_DEFAULT_MODEL,
    enabled: true,
    isDefault: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  try {
    await hostApiFetch(`/api/provider-accounts/${encodeURIComponent(accountId)}`, {
      method: 'PUT',
      body: JSON.stringify({
        updates: {
          label: accountPayload.label,
          authMode: accountPayload.authMode,
          baseUrl: accountPayload.baseUrl,
          model: accountPayload.model,
          enabled: accountPayload.enabled,
        },
        apiKey: cdk,
      }),
    });
  } catch {
    await hostApiFetch('/api/provider-accounts', {
      method: 'POST',
      body: JSON.stringify({ account: accountPayload, apiKey: cdk }),
    });
  }

  await hostApiFetch('/api/provider-accounts/default', {
    method: 'PUT',
    body: JSON.stringify({ accountId }),
  });
}
