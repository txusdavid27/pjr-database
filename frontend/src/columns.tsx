import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown, MoreHorizontal } from "lucide-react"

export type Player = {
    id: string
    nombre: string
    apodo: string
    numero: string
    nacimiento: string
    edad: number
    sexo: string
    activo: string
    lesiones: string
    caracter: string
    fortalezas: string
    debilidades: string
    velocidad: number
    resistencia: number
    fuerza: number
    cabeza: number
    tiro: number
    defenza: number
    ataque: number
    pase: number
    tiro_2: number
    goles: number
    amarillas: number
    rojas: number
    asistencias: number
    atajadas: number
    mejor_tiempo: string
    roles: string
    posicion: string
    posicion_secundaria: string
    foto: string
    contacto_emergencia: string
    contacto_propio: string
    documento: string
    apariciones: number
    puntualidad: number
    disputados: number
    partidos_pagos: number
    deuda_partidos: number
    amarillas_pagas: number
    rojas_pagas: number
    deuda_tarjetas: number
    deuda_uniformes: number
    deuda_inscripcion: number
    aporte_total: number
    deuda_total: number
    bonos: number
    pares_de_amarillas: number
    arco_cero: number
    balance_neto: number
    entrenamientos: number

    // Computed/Legacy
    name: string
    balance: string | number // Allow both for compatibility during transition
    photo: string
}

export const columns = (onViewDetails: (player: Player) => void): ColumnDef<Player>[] => [
    {
        id: "select",
        header: ({ table }) => (
            <Checkbox
                checked={
                    table.getIsAllPageRowsSelected() ||
                    (table.getIsSomePageRowsSelected() && "indeterminate")
                }
                onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                aria-label="Select all"
            />
        ),
        cell: ({ row }) => (
            <Checkbox
                checked={row.getIsSelected()}
                onCheckedChange={(value) => row.toggleSelected(!!value)}
                aria-label="Select row"
            />
        ),
        enableSorting: false,
        enableHiding: false,
    },
    {
        accessorKey: "photo",
        header: "Photo",
        cell: ({ row }) => (
            <img
                src={row.getValue("photo")}
                alt={row.getValue("name")}
                className="h-10 w-10 rounded-full object-cover border"
            />
        ),
        enableSorting: false,
    },
    {
        accessorKey: "name",
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                    Name
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            )
        },
        cell: ({ row }) => <div className="font-medium">{row.getValue("name")}</div>,
    },
    {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
            const val = row.original.balance
            const balance = typeof val === 'string' ? parseFloat(val) : val
            let status = "Settled"
            let color = "text-yellow-600 bg-yellow-100"

            if (balance > 0) {
                status = "Positive"
                color = "text-green-600 bg-green-100"
            } else if (balance < 0) {
                status = "Debt"
                color = "text-red-600 bg-red-100"
            }

            return (
                <span className={`px-2 py-1 rounded-full text-xs font-bold ${color}`}>
                    {status}
                </span>
            )
        },
    },
    {
        accessorKey: "balance",
        header: () => <div className="text-right">Balance</div>,
        cell: ({ row }) => {
            const val = row.getValue("balance") as string | number
            const amount = typeof val === 'string' ? parseFloat(val) : val
            const formatted = new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "USD",
            }).format(amount)

            const color = amount < 0 ? "text-red-600" : amount > 0 ? "text-green-600" : "text-gray-500"

            return <div className={`text-right font-medium ${color}`}>{formatted}</div>
        },
    },
    {
        id: "actions",
        enableHiding: false,
        cell: ({ row }) => {
            const player = row.original

            return (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem
                            onClick={() => navigator.clipboard.writeText(player.name)}
                        >
                            Copy Name
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onViewDetails(player)}>
                            View Details
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            )
        },
    },
]
