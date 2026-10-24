import {statusTone} from './status-tone';
                                                                       
export function StatusChip({text,testId,role}:{text:string;testId?:string;role?:'status'|'alert'}){
 return text?<span className={'status-chip tone-'+statusTone(text)} role={role} data-testid={testId} data-tone={statusTone(text)}>{text}</span>:null;
}
