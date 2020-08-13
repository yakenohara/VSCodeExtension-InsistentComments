// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

// <Settings>----------------------------------

const STR_PACKAGE_NAME = 'insistent-comments';
const STR_COMMAND_NAME = 'helloWorld';
const STR_EXTENSION_NAME = 'insistentComments';

// `/*` 直後と `*/` 直前のスペース幅
const STR_PROP_NAME_SPACE_MARGIN = 'spaceMargin';
const INT_DEFAULT_NUM_OF_SPACE = 0;

// `/*****/` とか `/*====*/` みたいなやつは幅調整時に使っている文字(`*` とか `=`) で幅調整するかどうか
const STR_PROP_NAME_MARGIN_CHAR_PREDICTING = 'marginCharacterPredicting';
const BL_DEFAULT_MARGIN_CHAR_PREDICTING = false;

// `marginCharacterPredicting` が有効な場合に、幅調整文字として認めるかどうかを判定する為の正規表現
const STR_PROP_NAME_REGEX_STR_FOR_MARGIN_CHAR_JUDGE = 'regexStrForMarginCharJudge';
const STR_DEFAULT_REGEX_STR_FOR_MARGIN_CHAR_JUDGE = '[\\\\x21-\\\\x2F\\\\x3A-\\\\x40\\\\x5B-\\\\x60\\\\x7B-\\\\x7E]';

// ---------------------------------</Settings>

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    // console.log('Congratulations, your extension "test" is now active!');

    // The command has been defined in the package.json file
    // Now provide the implementation of the command with registerCommand
    // The commandId parameter must match the command field in package.json
    let disposable = vscode.commands.registerCommand((STR_PACKAGE_NAME + '.' + STR_COMMAND_NAME), () => {
		// The code you place here will be executed every time your command is executed

		// <Option Checking>----------------------------------------------------------------------------
		
        const obj_conf = vscode.workspace.getConfiguration(STR_EXTENSION_NAME);
        const obj_numOfSpace = obj_conf.get(STR_PROP_NAME_SPACE_MARGIN);
		let int_numOfSpace:number;

        // `/*` 直後と `*/` 直前のスペース幅指定オプションチェック
		if(typeof obj_numOfSpace !== 'number'){ // number 型ではない場合
			let str_wrn = `Unknown variable type \`${(typeof obj_numOfSpace)}\` specified to ` + STR_EXTENSION_NAME + '.' + STR_PROP_NAME_SPACE_MARGIN;
            console.warn(str_wrn);
            vscode.window.showWarningMessage(str_wrn);
            int_numOfSpace = INT_DEFAULT_NUM_OF_SPACE;
            
		}else if(obj_numOfSpace < 0){ // 指定幅が マイナス値の場合
			let str_wrn = `Invalid number \`${(obj_numOfSpace.toString())}\` specified to ` + STR_EXTENSION_NAME + '.' + STR_PROP_NAME_SPACE_MARGIN;
            console.warn(str_wrn);
            vscode.window.showWarningMessage(str_wrn);
            int_numOfSpace = INT_DEFAULT_NUM_OF_SPACE;
        
        }else{
            int_numOfSpace = parseInt(obj_numOfSpace.toString());
            if(obj_numOfSpace - int_numOfSpace != 0){ // 小数が存在した場合
                let str_wrn =`fraction number \`${(obj_numOfSpace.toString())}\` specified to ` + STR_EXTENSION_NAME + '.' + STR_PROP_NAME_SPACE_MARGIN; 
                console.warn(str_wrn);
                vscode.window.showWarningMessage(str_wrn);
            }
		}

		const obj_marginCharPredicting = obj_conf.get(STR_PROP_NAME_MARGIN_CHAR_PREDICTING);
		let bl_marginCharPredicting:boolean;

		if(typeof obj_marginCharPredicting !== 'boolean'){ // number 型ではない場合
			let str_wrn = `Unknown variable type \`${(typeof obj_marginCharPredicting)}\` specified to ` + STR_EXTENSION_NAME + '.' + STR_PROP_NAME_MARGIN_CHAR_PREDICTING;
            console.warn(str_wrn);
            vscode.window.showWarningMessage(str_wrn);
			bl_marginCharPredicting = BL_DEFAULT_MARGIN_CHAR_PREDICTING;
		}else{
			bl_marginCharPredicting = obj_marginCharPredicting;
		}

		const obj_regexStrForMarginCharJudge = obj_conf.get(STR_PROP_NAME_REGEX_STR_FOR_MARGIN_CHAR_JUDGE);
		let str_regexStrForMarginCharJudge:string;
		let obj_regexForMarginCharJudge:RegExp;

		if(typeof obj_regexStrForMarginCharJudge !== 'string'){ // string 型ではない場合
			let str_wrn = `Unknown variable type \`${(typeof obj_regexStrForMarginCharJudge)}\` specified to ` + STR_EXTENSION_NAME + '.' + STR_PROP_NAME_REGEX_STR_FOR_MARGIN_CHAR_JUDGE;
            console.warn(str_wrn);
            vscode.window.showWarningMessage(str_wrn);
			str_regexStrForMarginCharJudge = STR_DEFAULT_REGEX_STR_FOR_MARGIN_CHAR_JUDGE;
		}else{
			str_regexStrForMarginCharJudge = obj_regexStrForMarginCharJudge;
		}

		try{
			obj_regexForMarginCharJudge = new RegExp(str_regexStrForMarginCharJudge);
		}catch (e){
			console.warn(e);
			let str_wrn = `Invalid RegExp string \`${(str_regexStrForMarginCharJudge)}\` specified to ` + STR_EXTENSION_NAME + '.' + STR_PROP_NAME_REGEX_STR_FOR_MARGIN_CHAR_JUDGE;
            console.warn(str_wrn);
            vscode.window.showWarningMessage(str_wrn);
			obj_regexForMarginCharJudge = new RegExp(STR_DEFAULT_REGEX_STR_FOR_MARGIN_CHAR_JUDGE);
		}
		
		// ---------------------------------------------------------------------------</Option Checking>
		
        
        let obj_editor = vscode.window.activeTextEditor; // エディタ取得

        if(typeof obj_editor === 'undefined'){
            return;
        }

        let objarr_toCommentOut: vscode.Range[] = []; // comment out 対象範囲(=置換範囲) たち

        // <Comment out 対象となる 行毎の選択範囲リストを作る>------------------------------------------------------------

        if(1 == obj_editor.selections.length){ //選択範囲が単一の場合

            // 改行毎に区切る
            for(let int_line = obj_editor.selection.start.line; int_line <= obj_editor.selection.end.line ; int_line++){

                let int_startChar = 0;
                let int_endChar = obj_editor.document.lineAt(int_line).range.end.character;
                if(int_line == obj_editor.selection.start.line){
                    int_startChar = obj_editor.selection.start.character;
                }
                if(int_line == obj_editor.selection.end.line){
                    int_endChar = obj_editor.selection.end.character;
                }

                let obj_tmpRange = 
                    new vscode.Range(
                        new vscode.Position(int_line, int_startChar),
                        new vscode.Position(int_line, int_endChar)
                    )
                ;
                
                objarr_toCommentOut.push(obj_tmpRange); // comment out 対象 range として追加

            }
            

        }else{ // 選択範囲が複数の場合

            for(let int_idxOfSelection = 0 ; int_idxOfSelection < obj_editor.selections.length ; int_idxOfSelection++){

                let obj_tmpSelection = obj_editor.selections[int_idxOfSelection];

                // 改行を含んでいないかどうかチェック
                if(!(obj_tmpSelection.isSingleLine)){ // 改行を含んでいる場合
                    let str_err = 'Multi selection includes line separator character';
                    console.error(str_err);
                    vscode.window.showErrorMessage(str_err);
                    return;
                }

                // comment out 対象 range として追加
                objarr_toCommentOut.push(
                    new vscode.Range(
                        new vscode.Position(obj_tmpSelection.start.line, obj_tmpSelection.start.character),
                        new vscode.Position(obj_tmpSelection.end.line, obj_tmpSelection.end.character)
                    )
                );
            }
        }

        // -----------------------------------------------------------</Comment out 対象となる 行毎の選択範囲リストを作る>

        if(0 == objarr_toCommentOut.length){ //変換対象が存在しない
            let str_err = 'Selection not found';
            console.error(str_err);
            vscode.window.showErrorMessage(str_err);
            return;
        }

        // Comment out 操作
        obj_editor.edit(obj_txtEditEdit => {

            if(typeof obj_editor === 'undefined'){
                return;
            }

            let obj_txtDoc = obj_editor.document; // ドキュメント取得

            //       here
            //       v
            // ~~~~~~/*~~~~~~*/~~~~~
            let int_startChar = 0;

            //                here
            //                v
            // ~~~~~~/*~~~~~~*/~~~~~
            let int_endChar = 0;

            // Comment out 対象となる 行毎の選択範囲リスト網羅
            for(let int_idxOfSelection = 0 ; int_idxOfSelection < objarr_toCommentOut.length ; int_idxOfSelection++){

                let obj_tmpRange = objarr_toCommentOut[int_idxOfSelection];

                let str_txt = obj_txtDoc.getText(obj_tmpRange);

                let int_widthOfSlashAster = 0; // 変換前文字列に `/*` を付加したら `2` にする
                let int_widthOfAsterSlash = 0; // 変換前文字列に `*/` を付加したら `2` にする
        
                if(!(/^\/\*.*/.test(str_txt))){ // '/*' から始まらない場合
                    str_txt = '/*' + str_txt;
                    int_widthOfSlashAster = 2;
                }
                if(!(/.*\*\/$/.test(str_txt))){ // '*/' で終らない場合
                    str_txt += '*/';
                    int_widthOfAsterSlash = 2;
                }

				let str_marginChar = ' ';
				
				if(bl_marginCharPredicting){
					
					let str_originalString = str_txt.slice(2, -2);

					if(
						obj_regexForMarginCharJudge.test(str_originalString.substr(0, 1)) &&
						(2 <= str_originalString.length) && //2文字以上
						(str_originalString.length == func_zen2han1(str_originalString)) // 全角文字を含まない
					){
						let str_firstChar = str_originalString.substr(0, 1);
						let int_idxOfOrigStr:number;
						for(int_idxOfOrigStr = 1 ; int_idxOfOrigStr < str_originalString.length ; int_idxOfOrigStr++){
							if(str_originalString.substr(int_idxOfOrigStr, 1) !== str_firstChar){ // 1文字目と異なる場合
								break;
							}
						}
						if(int_idxOfOrigStr == str_originalString.length){ //すべての文字が同じ場合
							str_marginChar = str_firstChar;
						}
					}
				}

				//左側に追加が必要なスペース量を求めるループ
                let int_idxCntSpaceLeft = 2;
                while(true){
                    if(
                        (str_txt.substr(int_idxCntSpaceLeft, 1) !== str_marginChar) ||
                        (str_txt.length - 2) <= int_idxCntSpaceLeft ||
                        int_numOfSpace <= (int_idxCntSpaceLeft - 2)
                    ){
                        break;
                    }
                    int_idxCntSpaceLeft++;
                }
                let int_spaceLeft = int_numOfSpace - (int_idxCntSpaceLeft - 2); //左側に追加が必要なスペース量

                if(0 < int_spaceLeft){ //スペース追加が必要な場合
                    str_txt = str_txt.substr(0, 2) + str_marginChar.repeat(int_spaceLeft) + str_txt.substr(2);
                }
                
                //右側に追加が必要なスペース量を求めるループ
                let int_idxCntSpaceRight = str_txt.length - 1 - 2;
                let int_idxStopperForLeft = int_idxCntSpaceLeft + int_spaceLeft - 1; //左側でカウント消化済みの index 番号
                while(true){
                    if(
                        (str_txt.substr(int_idxCntSpaceRight, 1) !== str_marginChar) ||
                        int_idxCntSpaceRight <= int_idxStopperForLeft ||
                        int_numOfSpace <= (str_txt.length - 1 - 2 - int_idxCntSpaceRight)
                    ){
                        break;
                    }
                    int_idxCntSpaceRight--;
                }
                let int_spaceRight = int_numOfSpace - (str_txt.length - 1 - 2 - int_idxCntSpaceRight); //右側に追加が必要なスペース量

                if(0 < int_spaceRight){
                    str_txt = str_txt.slice(0, -2) + str_marginChar.repeat(int_spaceRight) + str_txt.substr(-2);
                }

                if (int_idxOfSelection == 0){ // 最初の変換の場合

                    int_startChar = func_zen2han1ByPosition(obj_tmpRange.start, obj_txtDoc);

                    int_endChar =
                        func_zen2han1ByPosition(obj_tmpRange.end, obj_txtDoc) +
                        int_widthOfSlashAster + int_spaceLeft +
                        int_widthOfAsterSlash + int_spaceRight
                    ;
                
                }else{ // 2番目以降の変換の場合

                    let int_endCharCur =
                        func_zen2han1ByPosition(obj_tmpRange.end, obj_txtDoc) +
                        int_widthOfSlashAster + int_spaceLeft +
                        int_widthOfAsterSlash + int_spaceRight
                    ;

                    // <`/*` の位置を調整>--------------------------------------------------------------------

                    // `/*` の目標移動量を算出
                    let int_deltaStartChar = int_startChar - func_zen2han1ByPosition(obj_tmpRange.start, obj_txtDoc);

                    if(int_deltaStartChar < 0){ // 左へ移動したい場合

                        // スペース以外は削除しないようにして、本当に移動して良い量を決めるループ
                        let int_MoveChar = 0 ;
                        for(int_MoveChar = 0 ; int_deltaStartChar < int_MoveChar ; int_MoveChar--){

                            let str_tmpStr = obj_txtDoc.getText(
                                new vscode.Range(
                                    new vscode.Position(obj_tmpRange.start.line,obj_tmpRange.start.character + int_MoveChar - 1),
                                    new vscode.Position(obj_tmpRange.start.line,obj_tmpRange.start.character + int_MoveChar)
                                )
                            );
                            
                            if(str_tmpStr !== ' '){
                                break;
                            }
                        }
                        
                        // 移動量を加味して置換範囲を再設定
                        obj_tmpRange = new vscode.Range(
                            new vscode.Position(obj_tmpRange.start.line,obj_tmpRange.start.character + int_MoveChar),
                            new vscode.Position(obj_tmpRange.end.line,obj_tmpRange.end.character)
                        )
                        
                        // `*/` の目標移動量を算出するときに、ここで実際に移動 **できた** 量が必要なので上書き
                        int_deltaStartChar = int_MoveChar;

                    }else if(0 < int_deltaStartChar){ // 右へ移動したい場合
                        str_txt = ' '.repeat(int_deltaStartChar) + str_txt; // 移動量をスペースで埋める
                    }

                    // ------------------------------------------------------------------</ `/*` の位置を調整>


                    // <`*/` の位置を調整>--------------------------------------------------------------------

                    // `*/` の目標移動量を算出
                    let int_deltaEndChar = int_endChar - (int_endCharCur + int_deltaStartChar);

                    if(int_deltaEndChar < 0){ // 左へ移動したい場合

                        // スペース以外は削除しないようにして、本当に移動して良い量を決めるループ
                        let int_MoveChar = 0 ;
                        for(int_MoveChar = 0 ; int_deltaEndChar < int_MoveChar ; int_MoveChar--){

                            let str_tmpStr = str_txt.substr(int_MoveChar-2-1-int_numOfSpace, 1);

                            if(str_tmpStr !== str_marginChar){
                                break;
                            }
                        }

                        // 移動量を加味して置換後文字列を再設定
                        str_txt = str_txt.slice(0, int_MoveChar-2-int_numOfSpace) + str_marginChar.repeat(int_numOfSpace) + '*/';

                    }else if(0 < int_deltaEndChar){ // 右へ移動したい場合
                        str_txt = str_txt.replace(/\*\//, (str_marginChar.repeat(int_deltaEndChar) + '*/')); // 移動量をスペースで埋める
                    }

                    // ------------------------------------------------------------------</ `/*` の位置を調整>
                }
                
                // 置換
                obj_txtEditEdit.replace(obj_tmpRange, str_txt);
        
            }
        });
        
    });

    context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {}

// func_zen2han1 を position object を使って呼ぶ wrapper
function func_zen2han1ByPosition(obj_position:vscode.Position, obj_txtDoc:vscode.TextDocument){
    return func_zen2han1(obj_txtDoc.getText(new vscode.Range(
        new vscode.Position(obj_position.line, 0),
        new vscode.Position(obj_position.line, obj_position.character)
    )));
}

//
// 全角文字なら2、半角文字なら1としてカウントして、
// 文字列全体の長さを返す
//
function func_zen2han1(str_original:string){
    
    let int_result = 0;

    for(let int_idx = 0 ; int_idx < str_original.length ; int_idx++){
      
        // https://www.ling.upenn.edu/courses/Spring_2003/ling538/UnicodeRanges.html
        if(/[\u3000-\u9fff\uac00-\ud7af\uff01-\uff60]/.test(str_original.substr(int_idx, 1))){ // 全角文字の場合
            int_result += 2;
        
        }else{ //半角文字の場合
            int_result += 1;
        }
    }

    return int_result;
};
