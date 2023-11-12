package main

import (
	"fmt"
	"imperials/entities"
	"imperials/game"
	"log"
	"os"
	"reflect"
	"strings"
)

var done map[string]bool

func isPrimitive(ftn string) string {
	if ftn == "int" || ftn == "int16" || ftn == "int32" || ftn == "uint" || ftn == "uint16" || ftn == "uint32" {
		return "number"
	} else if ftn == "bool" {
		return "boolean"
	} else if ftn == "string" {
		return "string"
	} else if ftn == "interface {}" {
		return "any"
	} else {
		return ""
	}
}

func isPrimitiveRec(inp reflect.Type) string {
	for inp.Kind() == reflect.Ptr || inp.Kind() == reflect.Array || inp.Kind() == reflect.Slice {
		inp = inp.Elem()
	}

	if inp.Kind() != reflect.Struct {
		return isPrimitive(inp.Kind().String())
	}

	return ""
}

func stripSlicePtr(ftType reflect.Type) (reflect.Type, int) {
	isArray := 0

	for ftType.Kind() == reflect.Ptr {
		ftType = ftType.Elem()
	}

	for ftType.Kind() == reflect.Array || ftType.Kind() == reflect.Slice {
		isArray++
		ftType = ftType.Elem()
	}

	for ftType.Kind() == reflect.Ptr {
		ftType = ftType.Elem()
	}

	return ftType, isArray
}

func gen(inp reflect.Type) string {
	for inp.Kind() == reflect.Ptr || inp.Kind() == reflect.Array || inp.Kind() == reflect.Slice {
		inp = inp.Elem()
	}

	if inp.Kind() != reflect.Struct {
		prim := isPrimitiveRec(inp)
		if prim != "" && !done[inp.Name()] {
			log.Println(prim, inp.Kind().String())
			done[inp.Name()] = true
			res := fmt.Sprintf("export type %s = %s;\n", inp.Name(), prim)
			res += fmt.Sprintf("export type I%s = %s;\n", inp.Name(), prim)
			return res
		}

		return ""
	}

	v := reflect.New(inp).Elem()
	t := v.Type()

	if done[t.String()] {
		return ""
	} else {
		done[t.String()] = true
	}

	rec := make([]reflect.Type, 0)

	tstype := ""
	tsclass := ""
	tsclassdecl := ""
	tsclasscons := ""
	tsclassenc := ""

	tstype += fmt.Sprintf("export type I%s = {\n", t.Name())
	tsclass += fmt.Sprintf("export class %s implements I%s { \n", t.Name(), t.Name())
	tsclasscons += "constructor(input: any) {\n"

	tsclassenc += "public encode() {\n"
	tsclassenc += "const out: any = {};\n"

	for i := 0; i < v.NumField(); i++ {
		ft := t.Field(i) // Field type
		jtag := ft.Tag.Get("msgpack")
		isOptional := false

		if jtag == "-" {
			continue
		}

		if jtag == "" {
			jtag = ft.Name
		}

		jtaglist := strings.Split(jtag, ",")
		jtag = jtaglist[0]

		for i := 1; i < len(jtaglist); i++ {
			if jtaglist[i] == "omitempty" {
				isOptional = true
			}
		}

		ftype := ""
		prim := ""
		childClass := ""
		isArray := false
		isMap := false
		{
			ftType := ft.Type
			for ftType.Kind() == reflect.Ptr {
				ftType = ftType.Elem()
			}

			ftn := ftType.String()
			prim = isPrimitive(ftn)
			if prim != "" {
				ftype = prim
			} else if ft.Type.Kind() == reflect.Map {
				isMap = true
				finalKey, _ := stripSlicePtr(ftType.Key())
				finalVal, vaC := stripSlicePtr(ftType.Elem())
				finalValName := finalVal.Name()
				for i := 0; i < vaC; i++ {
					finalValName += "[]"
				}

				ftype = fmt.Sprintf("{[key: %s]: %s | undefined}", finalKey.Name(), finalValName)
				childClass = finalVal.Name()
				rec = append(rec, finalKey)
				rec = append(rec, finalVal)

			} else { // array/map/class
				finalType, arrC := stripSlicePtr(ftType)
				for i := 0; i < arrC; i++ {
					ftype += "[]"
					isArray = true
				}

				name := finalType.Name()
				childClass = name
				ftype = name + " /* " + ftn + " */" + ftype

				rec = append(rec, ftType)
			}
		}

		option := ""
		if isOptional {
			option = "?"
		}

		tstype += fmt.Sprintf("%s%s: %s;\n", ft.Name, option, ftype)
		tsclassdecl += fmt.Sprintf("public %s%s: %s;\n", ft.Name, option, ftype)

		childCons := fmt.Sprintf("input.%s", jtag)
		childEnc := fmt.Sprintf("this.%s", ft.Name)
		childConsExtra := ""
		childEncExtra := ""
		if isMap && isPrimitive(childClass) == "" {
			childConsExtra += fmt.Sprintf("Object.keys(input.%s).forEach((k: any) => {\n", jtag)
			childConsExtra += fmt.Sprintf(
				"this.%s[k] = input.%s[k] ? new %s(input.%s[k]) : undefined;\n",
				ft.Name, jtag, childClass, jtag)
			childConsExtra += "});\n"

			childEncExtra += fmt.Sprintf("Object.keys(out.%s).forEach((k: any) => {\n", jtag)
			childEncExtra += fmt.Sprintf(
				"out.%s[k] = out.%s[k]?.encode?.()\n",
				jtag, jtag)
			childEncExtra += "});\n"

		} else if prim == "" && isPrimitiveRec(rec[len(rec)-1]) == "" {
			if isArray {
				childCons = fmt.Sprintf("input.%s?.map((v: any) => v ? new %s(v) : undefined)", jtag, childClass)
				childEnc = fmt.Sprintf("this.%s?.map((v: any) => v?.encode?.())", ft.Name)
			} else {
				childCons = fmt.Sprintf("input.%s ? new %s(input.%s) : input.%s", jtag, childClass, jtag, jtag)
				childEnc = fmt.Sprintf("this.%s?.encode?.()", ft.Name)
			}
		}

		tsclasscons += fmt.Sprintf("this.%s = %s;\n", ft.Name, childCons) + childConsExtra
		tsclassenc += fmt.Sprintf("out.%s = %s;\n", jtag, childEnc) + childEncExtra
	}

	tstype += "}\n\n"
	tsclasscons += "}\n"
	tsclassenc += "return out; }\n"
	tsclass += tsclassdecl + "\n" + tsclasscons + "\n" + tsclassenc + "}\n\n"

	output := tstype + tsclass

	for _, r := range rec {
		log.Println("Recursing on", r)
		output += gen(r)
	}

	return output
}

func main() {
	done = make(map[string]bool)

	output := "/* eslint-disable @typescript-eslint/no-explicit-any */\n\n"

	output += gen(reflect.TypeOf(entities.GameSettings{}))
	output += gen(reflect.TypeOf(entities.AdvancedSettings{}))
	output += gen(reflect.TypeOf(entities.GameState{}))
	output += gen(reflect.TypeOf(entities.Vertex{}))
	output += gen(reflect.TypeOf(entities.Edge{}))
	output += gen(reflect.TypeOf(entities.VertexPlacement{}))
	output += gen(reflect.TypeOf(entities.Road{}))
	output += gen(reflect.TypeOf(entities.Port{}))
	output += gen(reflect.TypeOf(entities.PlayerState{}))
	output += gen(reflect.TypeOf(entities.PlayerSecretState{}))
	output += gen(reflect.TypeOf(entities.DieRollState{}))
	output += gen(reflect.TypeOf(entities.CardDeck{}))
	output += gen(reflect.TypeOf(entities.DevelopmentCardDeck{}))
	output += gen(reflect.TypeOf(entities.DevCardUseInfo{}))
	output += gen(reflect.TypeOf(entities.TradeOffer{}))
	output += gen(reflect.TypeOf(entities.GameOverMessage{}))
	output += gen(reflect.TypeOf(entities.Merchant{}))

	output += gen(reflect.TypeOf(entities.PlayerAction{}))
	output += gen(reflect.TypeOf(entities.PlayerActionChooseEdge{}))
	output += gen(reflect.TypeOf(entities.PlayerActionChooseVertex{}))
	output += gen(reflect.TypeOf(entities.PlayerActionChooseTile{}))
	output += gen(reflect.TypeOf(entities.PlayerActionChoosePlayer{}))
	output += gen(reflect.TypeOf(entities.PlayerActionSelectCards{}))

	output += gen(reflect.TypeOf(entities.LobbyPlayerState{}))

	output += gen(reflect.TypeOf(game.StoreGameState{}))

	err := os.WriteFile("ui_next/tsg.ts", []byte(output), 0644)
	if err != nil {
		panic(err)
	}
}
