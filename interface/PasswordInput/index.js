import { useState } from "react";
import { TextInput } from "@primer/react";
import { EyeClosedIcon, EyeIcon } from "@primer/octicons-react";

export default function PasswordInput(props) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <TextInput
      {...props}
      type={isVisible ? "text" : "password"}
      trailingAction={
        <TextInput.Action
          onClick={() => setIsVisible(!isVisible)}
          icon={isVisible ? EyeClosedIcon : EyeIcon}
          aria-label={isVisible ? "Esconder a senha" : "Mostrar a senha"}
        />
      }
    />
  );
}
