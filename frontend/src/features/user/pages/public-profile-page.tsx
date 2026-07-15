import { Center } from "@astryxdesign/core/Center";
import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { useAuthModule } from "@/core/auth/auth-module";

export interface PublicProfilePageProps {
  username: string;
}

export function PublicProfilePage({ username }: PublicProfilePageProps) {
  const { user } = useAuthModule();
  const isOwner = user?.username === username;

  return (
    <Center minHeight="100vh">
      <VStack gap={1} align="center">
        <Heading level={1} justify="center">
          {username}
        </Heading>
        <Text as="p" type="supporting" display="block" justify="center">
          {isOwner
            ? "This is your public profile."
            : "This profile is private. Only the owner can see detailed information."}
        </Text>
      </VStack>
    </Center>
  );
}

export default PublicProfilePage;
