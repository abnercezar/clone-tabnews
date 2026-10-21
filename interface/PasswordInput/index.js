import { useState } from "react";
import { TextInput, useFormControlForwardedProps } from "@primer/react";
import { EyeClosedIcon, EyeIcon } from "@primer/octicons-react";

export default function PasswordInput(props) {
  const [isVisible, setIsVisible] = useState(false);
  // Componente próprio não é reconhecido pelo FormControl: o hook traz o id,
  // o obrigatório e a mensagem de erro/legenda (aria-describedby) do campo.
  const forwardedProps = useFormControlForwardedProps(props);

  return (
    <TextInput
      {...forwardedProps}
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
