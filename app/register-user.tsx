import type { FieldApi } from "@tanstack/react-form";
import { useForm } from "@tanstack/react-form";
import { zodValidator } from "@tanstack/zod-form-adapter";
import React, { useCallback, useState } from "react";
import { Button, Input, YStack, Spinner, Text } from "tamagui";

import type { CreateUserRequest, User } from "../pomelo/utils/types";
import { createUser, getUser } from "../utils/pomelo/client";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function FieldInfo({ field }: { field: FieldApi<any, any, any, any> }) {
  return (
    <>
      {field.state.meta.touchedErrors ? <em>{field.state.meta.touchedErrors}</em> : undefined}
      {field.state.meta.isValidating ? "Validating..." : undefined}
    </>
  );
}
export default function Register() {
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<User>();

  const form = useForm({
    validatorAdapter: zodValidator,
    defaultValues: {
      email: "s@s.com",
      name: "James",
      surname: "Balboa",
      // yyyy-MM-dd
      birthdate: "2002-01-01",
      street_name: "Calle Piola",
      zip_code: "1111",
      city: "Guadalajara",
      region: "Guadalajara",
      country: "MEX",
      identification_type: "INE",
      identification_value: "123456789",
      gender: "MALE",
    },
    onSubmit: async ({ value: { street_name, zip_code, city, region, country, ...rest } }) => {
      setLoading(true);
      try {
        const body = {
          ...rest,
          legal_address: { street_name, zip_code: Number(zip_code), city, region, country },
        } satisfies Omit<CreateUserRequest, "operation_country">;

        const newUser = await createUser(body);
        console.log(newUser);
        setUser(newUser);
      } catch (error) {
        console.log(error);
      } finally {
        setLoading(false);
      }
    },
  });
  const logIn = useCallback(async () => {
    const usr = await getUser();
    setUser(usr);
  }, []);
  if (user) return <Text>{JSON.stringify(user)}</Text>;

  return (
    <YStack>
      <form.Provider>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            event.stopPropagation();
            void form.handleSubmit();
          }}
        >
          <YStack>
            <form.Field
              name="email"
              children={(field) => (
                <Input
                  placeholder="Your email"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChangeText={(value) => {
                    field.handleChange(value);
                  }}
                />
              )}
            />
            <form.Field
              name="name"
              children={(field) => (
                <Input
                  placeholder="First Name"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChangeText={(value) => {
                    field.handleChange(value);
                  }}
                />
              )}
            />
            <form.Field
              name="surname"
              children={(field) => (
                <Input
                  placeholder="Last Name"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChangeText={(value) => {
                    field.handleChange(value);
                  }}
                />
              )}
            />
            <form.Field
              name="birthdate"
              children={(field) => (
                <>
                  <Input
                    placeholder="Birth date"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChangeText={(value) => {
                      field.handleChange(value);
                    }}
                  />
                  <FieldInfo field={field} />
                </>
              )}
            />
            <form.Field
              name="street_name"
              children={(field) => (
                <>
                  <Input
                    placeholder="Street Name"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChangeText={(value) => {
                      field.handleChange(value);
                    }}
                  />
                  <FieldInfo field={field} />
                </>
              )}
            />
            <form.Field
              name="zip_code"
              children={(field) => (
                <>
                  <Input
                    placeholder="ZIP Code"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChangeText={(value) => {
                      field.handleChange(value);
                    }}
                  />
                  <FieldInfo field={field} />
                </>
              )}
            />
            <form.Field
              name="city"
              children={(field) => (
                <>
                  <Input
                    placeholder="City"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChangeText={(value) => {
                      field.handleChange(value);
                    }}
                  />
                  <FieldInfo field={field} />
                </>
              )}
            />
            <form.Field
              name="region"
              children={(field) => (
                <>
                  <Input
                    placeholder="Region"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChangeText={(value) => {
                      field.handleChange(value);
                    }}
                  />
                  <FieldInfo field={field} />
                </>
              )}
            />
            <form.Field
              name="country"
              children={(field) => (
                <>
                  <Input
                    placeholder="Country"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChangeText={(value) => {
                      field.handleChange(value);
                    }}
                  />
                  <FieldInfo field={field} />
                </>
              )}
            />
            <form.Field
              name="identification_type"
              children={(field) => (
                <>
                  <Input
                    placeholder="Identification Type"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChangeText={(value) => {
                      field.handleChange(value);
                    }}
                  />
                  <FieldInfo field={field} />
                </>
              )}
            />
            <form.Field
              name="identification_value"
              children={(field) => (
                <>
                  <Input
                    placeholder="Identification Value"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChangeText={(value) => {
                      field.handleChange(value);
                    }}
                  />
                  <FieldInfo field={field} />
                </>
              )}
            />
            <form.Field
              name="gender"
              children={(field) => (
                <>
                  <Input
                    placeholder="Gender"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChangeText={(value) => {
                      field.handleChange(value);
                    }}
                  />
                  <FieldInfo field={field} />
                </>
              )}
            />
          </YStack>
          <form.Subscribe
            selector={(state) => [state.canSubmit, state.isSubmitting]}
            children={([canSubmit, isSubmitting]) => (
              <Button icon={loading ? () => <Spinner /> : undefined} disabled={!canSubmit}>
                {isSubmitting ? "..." : "Submit"}
              </Button>
            )}
          />
        </form>
      </form.Provider>
      <Button onPress={logIn} variant="outlined">
        Log in
      </Button>
    </YStack>
  );
}
