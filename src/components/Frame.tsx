"use client";

import { useEffect, useCallback, useState } from "react";
import sdk, {
  AddFrame,
  SignIn as SignInCore,
  type Context,
} from "@farcaster/frame-sdk";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "~/components/ui/card";
import Image from "next/image";
import { PurpleButton } from "~/components/ui/PurpleButton";

import { config } from "~/components/providers/WagmiProvider";
import { truncateAddress } from "~/lib/truncateAddress";
import { base, optimism } from "wagmi/chains";
import { useSession } from "next-auth/react";
import { createStore } from "mipd";
import { Label } from "~/components/ui/label";
import { PROJECT_TITLE, MEDIA_GALLERY } from "~/lib/constants";

function MediaGallery() {
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const media = MEDIA_GALLERY[currentMediaIndex];

  const handlePrevious = () => {
    setCurrentMediaIndex(prev => (prev > 0 ? prev - 1 : MEDIA_GALLERY.length - 1));
  };

  const handleNext = () => {
    setCurrentMediaIndex(prev => (prev < MEDIA_GALLERY.length - 1 ? prev + 1 : 0));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Media Gallery</CardTitle>
        <CardDescription>
          Showing {currentMediaIndex + 1} of {MEDIA_GALLERY.length}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="relative aspect-square w-full overflow-hidden rounded-lg">
          {media.type === 'image' ? (
            <Image
              src={media.url}
              alt="Gallery media"
              className="h-full w-full object-cover"
              width={800}
              height={600}
              priority={currentMediaIndex === 0}
            />
          ) : (
            <video
              controls
              className="h-full w-full object-cover"
              src={media.url}
            />
          )}
        </div>
        
        <div className="flex gap-2 justify-between">
          <PurpleButton onClick={handlePrevious} className="flex-1">
            ← Previous
          </PurpleButton>
          <PurpleButton onClick={handleNext} className="flex-1">
            Next →
          </PurpleButton>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Frame() {
  const [isSDKLoaded, setIsSDKLoaded] = useState(false);
  const [context, setContext] = useState<Context.FrameContext>();

  const [added, setAdded] = useState(false);

  const [addFrameResult, setAddFrameResult] = useState("");

  const addFrame = useCallback(async () => {
    try {
      await sdk.actions.addFrame();
    } catch (error) {
      if (error instanceof AddFrame.RejectedByUser) {
        setAddFrameResult(`Not added: ${error.message}`);
      }

      if (error instanceof AddFrame.InvalidDomainManifest) {
        setAddFrameResult(`Not added: ${error.message}`);
      }

      setAddFrameResult(`Error: ${error}`);
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      const context = await sdk.context;
      if (!context) {
        return;
      }

      setContext(context);
      setAdded(context.client.added);

      // If frame isn't already added, prompt user to add it
      if (!context.client.added) {
        addFrame();
      }

      sdk.on("frameAdded", ({ notificationDetails }) => {
        setAdded(true);
      });

      sdk.on("frameAddRejected", ({ reason }) => {
        console.log("frameAddRejected", reason);
      });

      sdk.on("frameRemoved", () => {
        console.log("frameRemoved");
        setAdded(false);
      });

      sdk.on("notificationsEnabled", ({ notificationDetails }) => {
        console.log("notificationsEnabled", notificationDetails);
      });
      sdk.on("notificationsDisabled", () => {
        console.log("notificationsDisabled");
      });

      sdk.on("primaryButtonClicked", () => {
        console.log("primaryButtonClicked");
      });

      console.log("Calling ready");
      sdk.actions.ready({});

      // Set up a MIPD Store, and request Providers.
      const store = createStore();

      // Subscribe to the MIPD Store.
      store.subscribe((providerDetails) => {
        console.log("PROVIDER DETAILS", providerDetails);
        // => [EIP6963ProviderDetail, EIP6963ProviderDetail, ...]
      });
    };
    if (sdk && !isSDKLoaded) {
      console.log("Calling load");
      setIsSDKLoaded(true);
      load();
      return () => {
        sdk.removeAllListeners();
      };
    }
  }, [isSDKLoaded, addFrame]);

  if (!isSDKLoaded) {
    return <div>Loading...</div>;
  }

  return (
    <div
      style={{
        paddingTop: context?.client.safeAreaInsets?.top ?? 0,
        paddingBottom: context?.client.safeAreaInsets?.bottom ?? 0,
        paddingLeft: context?.client.safeAreaInsets?.left ?? 0,
        paddingRight: context?.client.safeAreaInsets?.right ?? 0,
      }}
    >
      <div className="w-[300px] mx-auto py-2 px-2">
        <h1 className="text-2xl font-bold text-center mb-4 text-gray-700 dark:text-gray-300">
          {PROJECT_TITLE}
        </h1>
        <MediaGallery />
      </div>
    </div>
  );
}
