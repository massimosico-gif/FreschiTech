/**
 * Dichiarazioni per i componenti UI ancora scritti in JSX.
 *
 * Finche' non saranno migrati a TypeScript non espongono un tipo di props:
 * `any` e' voluto, non una svista. Man mano che un componente viene
 * convertito, la relativa dichiarazione qui va rimossa.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

declare module '*/ui/DrawerShell' {
  const content: any;
  export default content;
}
declare module '*/ui/CategorySelector' {
  const content: any;
  export default content;
}
declare module '*/ui/Select' {
  const content: any;
  export default content;
}
declare module '*/ui/DatePicker' {
  const content: any;
  export default content;
}
declare module '*/ui/PhaseSelector' {
  const content: any;
  export default content;
}
